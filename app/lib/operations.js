import {assertAccess} from './access';

export async function createPurchase(db,user,input){
  assertAccess(user,'purchases');
  if(!input.supplierId||!input.lines?.length) throw new Error('Fournisseur et produits requis.');
  return db.$transaction(async tx=>{
    const purchase=await tx.purchase.create({data:{supplierId:input.supplierId,date:new Date(input.date),total:input.lines.reduce((n,x)=>n+x.quantity*x.unitCost,0),lines:{create:input.lines}}});
    for(const line of input.lines) await tx.stockMovement.create({data:{type:'PURCHASE',productId:line.productId,quantity:line.quantity,toId:input.generalLocationId,actorId:user.id,note:`Achat ${purchase.id}`}});
    return purchase;
  });
}

export async function assignStock(db,user,input){
  assertAccess(user,'assignments');
  const balance=await db.stockBalance.findUnique({where:{locationId_productId:{locationId:input.officeLocationId,productId:input.productId}}});
  if(!balance||balance.quantity<input.quantity) throw new Error('Stock bureau insuffisant.');
  return db.stockMovement.create({data:{type:'AGENT_ASSIGNMENT',productId:input.productId,quantity:input.quantity,fromId:input.officeLocationId,toId:input.agentLocationId,actorId:user.id,note:input.note||null}});
}

export async function recordExpense(db,user,input){
  assertAccess(user,'expenses');
  if(!(input.amount>0)||!input.note) throw new Error('Montant et motif requis.');
  return db.$transaction([db.expense.create({data:{category:input.category,amount:input.amount,note:input.note,agentId:input.agentId||null}}),db.cashMovement.create({data:{type:'EXPENSE',amount:input.amount,note:input.note,actorId:user.id}})]);
}
