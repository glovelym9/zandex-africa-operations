'use client';
import {useState} from 'react';

export default function OperationForm({title,fields,onSubmit}) {
  const [values,setValues]=useState({});
  const [message,setMessage]=useState('');
  function submit(event){event.preventDefault();const result=onSubmit?.(values)??{ok:true};setMessage(result.ok?'Opération enregistrée dans le journal de traçabilité.':result.error||'Vérifiez les informations saisies.');}
  return <form className="operation-form" onSubmit={submit}><h2>{title}</h2>{fields.map(field=><label key={field.id}>{field.label}<input required={field.required} type={field.type||'text'} min={field.min} value={values[field.id]||''} onChange={e=>setValues({...values,[field.id]:e.target.value})}/></label>)}<button className="primary" type="submit">Valider et tracer</button>{message&&<p className="form-message">{message}</p>}</form>;
}
