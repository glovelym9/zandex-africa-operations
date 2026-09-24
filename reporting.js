function within(date, from, to) { return (!from || date >= from) && (!to || date <= to); }

export function dailySummary(core,{from,to}={}) {
  const sales=core.sales.filter(x=>within(x.at.slice(0,10),from,to));
  const ledger=core.ledger.filter(x=>within(x.at.slice(0,10),from,to));
  const revenue=sales.reduce((sum,x)=>sum+x.total,0);
  const receipts=ledger.filter(x=>x.type==='CASH_RECEIPT').reduce((sum,x)=>sum+(x.amount||0),0);
  const expenses=ledger.filter(x=>x.type==='EXPENSE').reduce((sum,x)=>sum+(x.amount||0),0);
  return {from,to,revenue,receipts,expenses,netCash:receipts-expenses,salesCount:sales.length};
}

export function agentPerformance(core,agentId,{from,to}={}) {
  const sales=core.sales.filter(x=>x.agentId===agentId && within(x.at.slice(0,10),from,to));
  const revenue=sales.reduce((sum,x)=>sum+x.total,0);
  const units=sales.flatMap(x=>x.lines).reduce((sum,x)=>sum+x.quantity,0);
  return {agentId,revenue,units,salesCount:sales.length};
}
