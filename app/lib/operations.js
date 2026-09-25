import {assertAccess} from './access.js';

function positiveQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('La quantité doit être un entier positif.');
  return quantity;
}

function nonnegativeMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Montant invalide.');
  return amount;
}

async function credit(tx, locationId, productId, quantity) {
  await tx.stockBalance.upsert({
    where: {locationId_productId: {locationId, productId}},
    create: {locationId, productId, quantity},
    update: {quantity: {increment: quantity}},
  });
}

async function debit(tx, locationId, productId, quantity) {
  const result = await tx.stockBalance.updateMany({
    where: {locationId, productId, quantity: {gte: quantity}},
    data: {quantity: {decrement: quantity}},
  });
  if (result.count !== 1) throw new Error('Stock insuffisant à cet emplacement.');
}

export async function createPurchase(db, user, input) {
  assertAccess(user, 'purchases');
  if (!input.supplierId || !input.generalLocationId || !input.lines?.length) {
    throw new Error('Fournisseur, stock général et produits requis.');
  }
  const lines = input.lines.map(line => ({
    productId: line.productId,
    quantity: positiveQuantity(line.quantity),
    unitCost: nonnegativeMoney(line.unitCost),
  }));
  if (lines.some(line => !line.productId)) throw new Error('Produit requis pour chaque ligne.');
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) throw new Error('Date d’achat invalide.');
  return db.$transaction(async tx => {
    const purchase = await tx.purchase.create({
      data: {
        supplierId: input.supplierId,
        date,
        total: lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0),
        lines: {create: lines},
      },
    });
    for (const line of lines) {
      await credit(tx, input.generalLocationId, line.productId, line.quantity);
      await tx.stockMovement.create({
        data: {
          type: 'PURCHASE', productId: line.productId, quantity: line.quantity,
          toId: input.generalLocationId, actorId: user.id, note: `Achat ${purchase.id}`,
        },
      });
    }
    return purchase;
  });
}

export async function transferStock(db, user, input) {
  assertAccess(user, 'assignments');
  const quantity = positiveQuantity(input.quantity);
  if (!input.productId || !input.fromId || !input.toId || input.fromId === input.toId) {
    throw new Error('Choisissez un produit et deux emplacements distincts.');
  }
  const type = input.type || 'AGENT_ASSIGNMENT';
  if (!['OFFICE_SUPPLY', 'AGENT_ASSIGNMENT', 'AGENT_RETURN'].includes(type)) {
    throw new Error('Type de transfert invalide.');
  }
  return db.$transaction(async tx => {
    await debit(tx, input.fromId, input.productId, quantity);
    await credit(tx, input.toId, input.productId, quantity);
    return tx.stockMovement.create({
      data: {type, productId: input.productId, quantity, fromId: input.fromId,
        toId: input.toId, actorId: user.id, note: input.note || null},
    });
  });
}

export async function assignStock(db, user, input) {
  return transferStock(db, user, {
    ...input, type: 'AGENT_ASSIGNMENT',
    fromId: input.officeLocationId, toId: input.agentLocationId,
  });
}

export async function recordSale(db, user, input) {
  assertAccess(user, 'sales');
  if (!input.locationId || !input.lines?.length) throw new Error('Emplacement et produits vendus requis.');
  const cashReceived = nonnegativeMoney(input.cashReceived);
  const lines = input.lines.map(line => ({
    productId: line.productId,
    quantity: positiveQuantity(line.quantity),
    discount: nonnegativeMoney(line.discount || 0),
  }));
  if (lines.some(line => !line.productId)) throw new Error('Produit requis pour chaque ligne.');
  return db.$transaction(async tx => {
    const location = await tx.stockLocation.findUnique({where: {id: input.locationId}});
    if (!location || (location.type === 'AGENT' && location.agentId !== input.agentId)
      || (location.type === 'BUREAU' && input.agentId)
      || !['AGENT', 'BUREAU'].includes(location.type)) {
      throw new Error('Emplacement de vente incompatible avec l’agent.');
    }
    let total = 0;
    let discount = 0;
    const saleLines = [];
    for (const line of lines) {
      const product = await tx.product.findUnique({where: {id: line.productId}});
      if (!product?.active) throw new Error('Produit introuvable ou inactif.');
      const unitPrice = Number(product.salePrice);
      const gross = unitPrice * line.quantity;
      if (line.discount > gross) throw new Error('La remise dépasse la valeur de la ligne.');
      total += gross - line.discount;
      discount += line.discount;
      saleLines.push({...line, unitPrice});
    }
    if (cashReceived !== total && !input.varianceNote?.trim()) {
      throw new Error('Un écart entre ventes et argent remis exige une justification écrite.');
    }
    for (const line of saleLines) await debit(tx, input.locationId, line.productId, line.quantity);
    const sale = await tx.sale.create({data: {
      agentId: input.agentId || null, total, discount, cashReceived,
      lines: {create: saleLines},
    }});
    for (const line of saleLines) {
      await tx.stockMovement.create({data: {
        type: input.agentId ? 'AGENT_SALE' : 'DIRECT_SALE', productId: line.productId,
        quantity: line.quantity, fromId: input.locationId, actorId: user.id,
        note: `Vente ${sale.id}`,
      }});
    }
    await tx.cashMovement.create({data: {
      type: 'SALE_RECEIPT', amount: cashReceived, actorId: user.id,
      note: `Vente ${sale.id}${input.varianceNote ? ` — ${input.varianceNote.trim()}` : ''}`,
    }});
    return sale;
  });
}

export async function recordExpense(db, user, input) {
  assertAccess(user, 'expenses');
  const amount = nonnegativeMoney(input.amount);
  if (amount === 0 || !input.category || !input.note?.trim()) {
    throw new Error('Catégorie, montant positif et motif requis.');
  }
  return db.$transaction(async tx => {
    const expense = await tx.expense.create({
      data: {category: input.category, amount, note: input.note.trim(), agentId: input.agentId || null},
    });
    await tx.cashMovement.create({
      data: {type: 'EXPENSE', amount, note: input.note.trim(), actorId: user.id},
    });
    return expense;
  });
}
