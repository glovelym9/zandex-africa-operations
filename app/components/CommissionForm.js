'use client';
import {useState} from 'react';

export default function CommissionForm({data,busy,operation}) {
  const [agentId,setAgentId]=useState('');
  const [rate,setRate]=useState('');
  const [salesAmount,setSalesAmount]=useState('');
  async function submit(event) {
    event.preventDefault();
    if(await operation('commission',{agentId,salesAmount:Number(salesAmount),rate:Number(rate)},'Commission enregistrée dans la caisse et le journal.')){setRate('');setSalesAmount('');}
  }
  return <section className="panel below"><div className="panelhead"><b>Commission agent</b></div><form className="operation-form" onSubmit={submit}>
    <label>Agent<select required value={agentId} onChange={event=>setAgentId(event.target.value)}><option value="">Sélectionner un agent</option>{data.agents.filter(agent=>agent.active).map(agent=><option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
    <label>Taux (%)<input required type="number" min="0" max="100" step="0.01" value={rate} onChange={event=>setRate(event.target.value)}/></label>
    <label>Ventes retenues pour cette commission (FC)<input required type="number" min="0.01" step="0.01" value={salesAmount} onChange={event=>setSalesAmount(event.target.value)}/></label>
    <div className="calculated">Commission : {(Math.round(Number(salesAmount||0)*Number(rate||0))/100).toLocaleString('fr-FR')} FC</div>
    <button className="primary" disabled={busy||!agentId}>Enregistrer la commission</button>
  </form></section>;
}
