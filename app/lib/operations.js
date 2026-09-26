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
    const general = await tx.stockLocation.findUnique({where: {id: input.generalLocationId}});
    if (general?.type !== 'GENERAL') throw new Error('Le stock général choisi est invalide.');
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
    const [from, to] = await Promise.all([
      tx.stockLocation.findUnique({where: {id: input.fromId}}),
      tx.stockLocation.findUnique({where: {id: input.toId}}),
    ]);
    const expected = {
      OFFICE_SUPPLY: ['GENERAL', 'BUREAU'],
      AGENT_ASSIGNMENT: ['BUREAU', 'AGENT'],
      AGENT_RETURN: ['AGENT', 'BUREAU'],
    }[type];
    if (from?.type !== expected[0] || to?.type !== expected[1]) {
      throw new Error('Circuit de stock incompatible avec les emplacements.');
    }
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
  if (user.role !== 'DIRECTION' && input.lines.some(line => Number(line.discount || 0) > 0)) {
    throw new Error('Accès non autorisé.');
  }
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

export async function countInventory(db, user, input) {
  assertAccess(user, 'inventory');
  if (!input.locationId || !input.productId) throw new Error('Emplacement et produit requis.');
  const physical = Number(input.physical);
  if (!Number.isInteger(physical) || physical < 0) throw new Error('Quantité physique invalide.');
  return db.$transaction(async tx => {
    const balance = await tx.stockBalance.findUnique({where: {
      locationId_productId: {locationId: input.locationId, productId: input.productId},
    }});
    const theoretical = balance?.quantity || 0;
    const variance = physical - theoretical;
    const justification = input.justification?.trim() || null;
    if (variance !== 0 && !justification) throw new Error('Un écart d’inventaire exige une justification écrite.');
    await tx.stockBalance.upsert({
      where: {locationId_productId: {locationId: input.locationId, productId: input.productId}},
      create: {locationId: input.locationId, productId: input.productId, quantity: physical},
      update: {quantity: physical},
    });
    const count = await tx.inventoryCount.create({data: {
      locationId: input.locationId, productId: input.productId, theoretical, physical,
      variance, justification, actorId: user.id,
    }});
    if (variance !== 0) await tx.stockMovement.create({data: {
      type: 'INVENTORY_ADJUSTMENT', productId: input.productId,
      quantity: Math.abs(variance),
      ...(variance > 0 ? {toId: input.locationId} : {fromId: input.locationId}),
      actorId: user.id, note: `Inventaire ${count.id} — ${justification}`,
    }});
    return count;
  });
}

export async function recordDeposit(db, user, input) {
  assertAccess(user, 'cash');
  const amount = nonnegativeMoney(input.amount);
  if (!amount || !input.account?.trim() || !input.proof?.trim()) {
    throw new Error('Montant, compte destinataire et preuve du versement requis.');
  }
  return db.cashMovement.create({data: {
    type: 'BANK_DEPOSIT', amount, account: input.account.trim(), proof: input.proof.trim(),
    note: input.note?.trim() || null, actorId: user.id,
  }});
}

export async function recordCommission(db, user, input) {
  assertAccess(user, 'cash');
  const salesAmount = nonnegativeMoney(input.salesAmount);
  const rate = Number(input.rate);
  if (!input.agentId || !Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new Error('Agent et taux entre 0 et 100 requis.');
  }
  const agent = await db.agent.findUnique({where: {id: input.agentId}});
  if (!agent?.active) throw new Error('Agent introuvable ou inactif.');
  const amount = Math.round(salesAmount * rate) / 100;
  return db.cashMovement.create({data: {
    type: 'COMMISSION', amount, actorId: user.id,
    note: `Commission ${agent.name} : ${rate}% de ${salesAmount}. ${input.note?.trim() || ''}`,
  }});
}

export async function closeDay(db, user, input) {
  assertAccess(user, 'cash');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.businessDate || '')) throw new Error('Date de clôture invalide.');
  const day = new Date(`${input.businessDate}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== input.businessDate) {
    throw new Error('Date de clôture invalide.');
  }
  const next = new Date(day.getTime() + 86400000);
  return db.$transaction(async tx => {
    const existing = await tx.dayClosing.findUnique({where: {businessDate: day}});
    if (existing) throw new Error('Cette journée est déjà clôturée.');
    const latest = await tx.dayClosing.findFirst({orderBy: {businessDate: 'desc'}});
    if (latest && latest.businessDate >= day) throw new Error('La clôture doit suivre la dernière journée clôturée.');
    const previous = await tx.dayClosing.findFirst({where: {businessDate: {lt: day}}, orderBy: {businessDate: 'desc'}});
    const openingBalance = previous ? Number(previous.closingBalance) : nonnegativeMoney(input.openingBalance);
    const movements = await tx.cashMovement.findMany({where: {createdAt: {gte: day, lt: next}}});
    const sum = type => movements.filter(m => m.type === type).reduce((n, m) => n + Number(m.amount), 0);
    const receipts = sum('SALE_RECEIPT');
    const expenses = sum('EXPENSE');
    const deposits = sum('BANK_DEPOSIT');
    const commissions = sum('COMMISSION');
    const closingBalance = openingBalance + receipts - expenses - deposits - commissions;
    if (closingBalance < 0 && !input.note?.trim()) throw new Error('Un solde négatif exige une justification écrite.');
    return tx.dayClosing.create({data: {
      businessDate: day, openingBalance, receipts, expenses, deposits, commissions,
      closingBalance, note: input.note?.trim() || null, actorId: user.id,
    }});
  });
}
