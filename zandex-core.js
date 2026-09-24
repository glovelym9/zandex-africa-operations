/* Noyau métier V1 : chaque mutation génère un mouvement traçable. */
export class ZandExCore {
  constructor() { this.products=[]; this.agents=[]; this.stock=new Map(); this.ledger=[]; this.sales=[]; }
  key(location, productId) { return `${location}:${productId}`; }
  quantity(location, productId) { return this.stock.get(this.key(location, productId)) || 0; }
  move({productId, from=null, to=null, quantity, actor, type, note=''}) {
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantité invalide');
    if (from && this.quantity(from, productId) < quantity) throw new Error('Stock insuffisant');
    if (from) this.stock.set(this.key(from, productId), this.quantity(from, productId) - quantity);
    if (to) this.stock.set(this.key(to, productId), this.quantity(to, productId) + quantity);
    this.ledger.push({id:crypto.randomUUID(), at:new Date().toISOString(), type, productId, from, to, quantity, actor, note});
  }
  purchase({supplier, lines, actor}) { lines.forEach(x=>this.move({productId:x.productId,to:'general',quantity:x.quantity,actor,type:'PURCHASE',note:supplier})); }
  supplyOffice({lines, actor}) { lines.forEach(x=>this.move({productId:x.productId,from:'general',to:'office',quantity:x.quantity,actor,type:'OFFICE_SUPPLY'})); }
  assignAgent({agentId, lines, actor}) { lines.forEach(x=>this.move({productId:x.productId,from:'office',to:`agent/${agentId}`,quantity:x.quantity,actor,type:'AGENT_ASSIGNMENT'})); }
  dailyReport({agentId, lines, cashReceived, actor}) {
    const total=lines.reduce((sum,line)=>sum+(line.quantity*line.unitPrice)-(line.discount||0),0);
    lines.forEach(line=>this.move({productId:line.productId,from:`agent/${agentId}`,quantity:line.quantity,actor,type:'AGENT_SALE',note:`Rapport agent ${agentId}`}));
    this.sales.push({id:crypto.randomUUID(),agentId,lines,total,cashReceived,actor,at:new Date().toISOString()});
    this.ledger.push({id:crypto.randomUUID(),at:new Date().toISOString(),type:'CASH_RECEIPT',amount:cashReceived,actor,note:`Rapport agent ${agentId}`});
    return total;
  }
  expense({category, amount, agentId=null, actor, note}) { if(amount<=0) throw new Error('Montant invalide'); this.ledger.push({id:crypto.randomUUID(),at:new Date().toISOString(),type:'EXPENSE',category,amount,agentId,actor,note}); }
  inventory({location, lines, actor, justification=''}) {
    return lines.map(line => {
      const theoretical=this.quantity(location,line.productId);
      const variance=line.physicalQuantity-theoretical;
      if (variance !== 0 && !justification) throw new Error('Un écart d’inventaire doit être justifié');
      this.stock.set(this.key(location,line.productId),line.physicalQuantity);
      const record={id:crypto.randomUUID(),at:new Date().toISOString(),type:'INVENTORY',location,productId:line.productId,theoretical,physical:line.physicalQuantity,variance,actor,justification};
      this.ledger.push(record); return record;
    });
  }
  closeDay({openingBalance, actor, note=''}) {
    const today=new Date().toISOString().slice(0,10);
    const entries=this.ledger.filter(x=>x.at.slice(0,10)===today);
    const receipts=entries.filter(x=>x.type==='CASH_RECEIPT').reduce((n,x)=>n+(x.amount||0),0);
    const expenses=entries.filter(x=>x.type==='EXPENSE').reduce((n,x)=>n+(x.amount||0),0);
    const closingBalance=openingBalance+receipts-expenses;
    const closing={id:crypto.randomUUID(),at:new Date().toISOString(),type:'DAY_CLOSING',openingBalance,receipts,expenses,closingBalance,actor,note};
    this.ledger.push(closing); return closing;
  }
  returnFromAgent({agentId, lines, actor, note=''}) { lines.forEach(x=>this.move({productId:x.productId,from:`agent/${agentId}`,to:'office',quantity:x.quantity,actor,type:'AGENT_RETURN',note})); }
  bankDeposit({amount, account, actor, proof}) {
    if(amount<=0 || !proof) throw new Error('Un versement bancaire requiert un montant et une preuve');
    const record={id:crypto.randomUUID(),at:new Date().toISOString(),type:'BANK_DEPOSIT',amount,account,actor,proof};
    this.ledger.push(record); return record;
  }
  commission({agentId, salesAmount, rate, actor}) {
    if (!(salesAmount >= 0) || !(rate >= 0 && rate <= 1)) throw new Error('Règle de commission invalide');
    const amount=Math.round(salesAmount * rate);
    const record={id:crypto.randomUUID(),at:new Date().toISOString(),type:'COMMISSION',agentId,salesAmount,rate,amount,actor};
    this.ledger.push(record); return record;
  }
}
