import test from 'node:test';
import assert from 'node:assert/strict';
import {createPurchase, transferStock, recordExpense, recordSale} from './operations.js';

const user = {id: 'direction-1', role: 'DIRECTION'};

function database(initial = {}) {
  const state = {balances: {...initial}, movements: [], purchases: [], sales: [], expenses: [], cash: []};
  return {
    state,
    async $transaction(work) {
      const draft = structuredClone(state);
      const key = (locationId, productId) => `${locationId}:${productId}`;
      const tx = {
        stockBalance: {
          async upsert({where, create, update}) {
            const id = key(where.locationId_productId.locationId, where.locationId_productId.productId);
            draft.balances[id] = id in draft.balances
              ? draft.balances[id] + update.quantity.increment : create.quantity;
          },
          async updateMany({where, data}) {
            const id = key(where.locationId, where.productId);
            if ((draft.balances[id] || 0) < where.quantity.gte) return {count: 0};
            draft.balances[id] -= data.quantity.decrement;
            return {count: 1};
          },
        },
        purchase: {async create({data}) {
          const purchase = {id: `purchase-${draft.purchases.length + 1}`, ...data};
          draft.purchases.push(purchase);
          return purchase;
        }},
        stockLocation: {async findUnique({where}) {
          return where.id === 'agent-location' ? {id: where.id, type: 'AGENT', agentId: 'agent-1'}
            : where.id === 'office' ? {id: where.id, type: 'BUREAU', agentId: null} : null;
        }},
        product: {async findUnique({where}) {
          return where.id === 'a' ? {id: 'a', active: true, salePrice: 10}
            : where.id === 'b' ? {id: 'b', active: true, salePrice: 20} : null;
        }},
        sale: {async create({data}) {
          const sale = {id: `sale-${draft.sales.length + 1}`, ...data};
          draft.sales.push(sale);
          return sale;
        }},
        stockMovement: {async create({data}) {
          draft.movements.push(data);
          return data;
        }},
        expense: {async create({data}) {
          draft.expenses.push(data);
          return data;
        }},
        cashMovement: {async create({data}) {draft.cash.push(data);}},
      };
      const result = await work(tx);
      Object.assign(state, draft);
      return result;
    },
  };
}

test('un achat crédite le stock et laisse une trace par ligne', async () => {
  const db = database();
  await createPurchase(db, user, {supplierId: 'supplier-1', generalLocationId: 'general', date: '2026-09-24', lines: [
    {productId: 'a', quantity: 3, unitCost: 12},
    {productId: 'b', quantity: 2, unitCost: 5},
  ]});
  assert.deepEqual(db.state.balances, {'general:a': 3, 'general:b': 2});
  assert.equal(db.state.purchases[0].total, 46);
  assert.equal(db.state.movements.length, 2);
  assert.ok(db.state.movements.every(movement => movement.type === 'PURCHASE' && movement.actorId === user.id));
});

test('un transfert déplace le stock sans changer le total', async () => {
  const db = database({'general:a': 5});
  await transferStock(db, user, {fromId: 'general', toId: 'office', productId: 'a', quantity: 3, type: 'OFFICE_SUPPLY'});
  assert.equal(db.state.balances['general:a'], 2);
  assert.equal(db.state.balances['office:a'], 3);
  assert.equal(db.state.movements[0].type, 'OFFICE_SUPPLY');
});

test('un transfert sans stock ne crée aucun mouvement', async () => {
  const db = database({'general:a': 1});
  await assert.rejects(transferStock(db, user, {fromId: 'general', toId: 'office', productId: 'a', quantity: 2}), /Stock insuffisant/);
  assert.deepEqual(db.state.balances, {'general:a': 1});
  assert.equal(db.state.movements.length, 0);
});

test('une dépense génère une écriture de caisse liée au responsable', async () => {
  const db = database();
  await recordExpense(db, user, {category: 'Transport', amount: 15, note: 'Livraison'});
  assert.equal(db.state.expenses[0].amount, 15);
  assert.deepEqual(db.state.cash[0], {type: 'EXPENSE', amount: 15, note: 'Livraison', actorId: user.id});
});

test('un rapport multi-produits retire le stock agent et crédite la caisse', async () => {
  const db = database({'agent-location:a': 5, 'agent-location:b': 3});
  const sale = await recordSale(db, user, {
    locationId: 'agent-location', agentId: 'agent-1', cashReceived: 48,
    lines: [{productId: 'a', quantity: 3, discount: 2}, {productId: 'b', quantity: 1}],
  });
  assert.equal(sale.total, 48);
  assert.equal(db.state.balances['agent-location:a'], 2);
  assert.equal(db.state.balances['agent-location:b'], 2);
  assert.equal(db.state.movements.length, 2);
  assert.equal(db.state.cash[0].amount, 48);
});

test('un écart de caisse non justifié annule toute la vente', async () => {
  const db = database({'agent-location:a': 5});
  await assert.rejects(recordSale(db, user, {
    locationId: 'agent-location', agentId: 'agent-1', cashReceived: 9,
    lines: [{productId: 'a', quantity: 1}],
  }), /justification écrite/);
  assert.equal(db.state.balances['agent-location:a'], 5);
  assert.equal(db.state.sales.length, 0);
  assert.equal(db.state.cash.length, 0);
});
