import test from 'node:test';
import assert from 'node:assert/strict';
import {createPurchase, transferStock, recordExpense, recordSale, countInventory, recordDeposit, closeDay} from './operations.js';

const user = {id: 'direction-1', role: 'DIRECTION'};

function database(initial = {}) {
  const state = {balances: {...initial}, movements: [], purchases: [], sales: [], expenses: [], cash: [], inventories: [], closings: []};
  return {
    state,
    cashMovement: {async create({data}) {state.cash.push(data); return data;}},
    async $transaction(work) {
      const draft = structuredClone(state);
      const key = (locationId, productId) => `${locationId}:${productId}`;
      const tx = {
        stockBalance: {
          async upsert({where, create, update}) {
            const id = key(where.locationId_productId.locationId, where.locationId_productId.productId);
            draft.balances[id] = id in draft.balances
              ? update.quantity.increment === undefined ? update.quantity : draft.balances[id] + update.quantity.increment : create.quantity;
          },
          async findUnique({where}) {
            const id = key(where.locationId_productId.locationId, where.locationId_productId.productId);
            return id in draft.balances ? {quantity: draft.balances[id]} : null;
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
            : where.id === 'office' ? {id: where.id, type: 'BUREAU', agentId: null}
              : where.id === 'general' ? {id: where.id, type: 'GENERAL', agentId: null} : null;
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
        inventoryCount: {async create({data}) {
          const count = {id: `inventory-${draft.inventories.length + 1}`, ...data};
          draft.inventories.push(count);
          return count;
        }},
        dayClosing: {
          async findUnique({where}) {return draft.closings.find(item=>item.businessDate.getTime()===where.businessDate.getTime())||null;},
          async findFirst({orderBy,where}) {
            const rows = draft.closings.filter(item=>!where?.businessDate?.lt||item.businessDate<where.businessDate.lt);
            return rows.sort((a,b)=>b.businessDate-a.businessDate)[0]||null;
          },
          async create({data}) {const record={id:`closing-${draft.closings.length+1}`,...data};draft.closings.push(record);return record;},
        },
      };
      tx.cashMovement.findMany = async ({where}) => draft.cash.filter(item=>item.createdAt>=where.createdAt.gte&&item.createdAt<where.createdAt.lt);
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
  await assert.rejects(transferStock(db, user, {fromId: 'general', toId: 'office', productId: 'a', quantity: 2, type: 'OFFICE_SUPPLY'}), /Stock insuffisant/);
  assert.deepEqual(db.state.balances, {'general:a': 1});
  assert.equal(db.state.movements.length, 0);
});

test('un transfert ne peut pas contourner le circuit général → bureau → agent', async () => {
  const db = database({'general:a': 5});
  await assert.rejects(transferStock(db, user, {fromId: 'general', toId: 'agent-location', productId: 'a', quantity: 1, type: 'AGENT_ASSIGNMENT'}), /incompatible/);
  assert.equal(db.state.balances['general:a'], 5);
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

test('un inventaire avec écart exige une justification et écrit le mouvement', async () => {
  const db = database({'office:a': 5});
  await assert.rejects(countInventory(db,user,{locationId:'office',productId:'a',physical:3}),/justification/);
  assert.equal(db.state.balances['office:a'],5);
  const count=await countInventory(db,user,{locationId:'office',productId:'a',physical:3,justification:'Casse constatée'});
  assert.equal(count.variance,-2);
  assert.equal(db.state.balances['office:a'],3);
  assert.equal(db.state.movements[0].quantity,2);
});

test('un versement exige une preuve et une clôture reporte le solde', async () => {
  const db=database();
  await assert.rejects(recordDeposit(db,user,{amount:10,account:'Banque'}),/preuve/);
  await recordDeposit(db,user,{amount:10,account:'Banque',proof:'BORD-1'});
  db.state.cash[0].createdAt=new Date('2026-09-24T10:00:00Z');
  db.state.cash.push({type:'SALE_RECEIPT',amount:100,createdAt:new Date('2026-09-24T11:00:00Z')});
  const first=await closeDay(db,user,{businessDate:'2026-09-24',openingBalance:30});
  assert.equal(first.closingBalance,120);
  const second=await closeDay(db,user,{businessDate:'2026-09-25',openingBalance:0});
  assert.equal(second.openingBalance,120);
});
