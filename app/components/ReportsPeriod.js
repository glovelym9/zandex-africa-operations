'use client';
import {useMemo,useState} from 'react';
import {Reports} from './WorkspaceModules.js';

export default function ReportsPeriod({data}) {
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const invalid=Boolean(from&&to&&from>to);
  const filtered=useMemo(()=>{
    const included=item=>{
      const day=String(item.businessDate||item.createdAt||'').slice(0,10);
      return !invalid&&(!from||day>=from)&&(!to||day<=to);
    };
    return {...data,sales:data.sales.filter(included),cash:data.cash.filter(included),movements:data.movements.filter(included),closings:data.closings.filter(included)};
  },[data,from,to,invalid]);
  return <><section className="panel"><div className="operation-form">
    <label>Du<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label>
    <label>Au<input type="date" value={to} onChange={event=>setTo(event.target.value)}/></label>
    <button className="quiet" type="button" onClick={()=>{setFrom('');setTo('');}}>Toutes les dates</button>
    {invalid&&<p role="alert">La date de fin doit suivre la date de début.</p>}
  </div></section><Reports data={filtered}/></>;
}
