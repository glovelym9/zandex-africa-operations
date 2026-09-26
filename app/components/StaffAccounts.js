'use client';
import {useState} from 'react';
export default function StaffAccounts(){
  const [draft,setDraft]=useState({name:'',email:'',password:'',role:'GESTIONNAIRE'});
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(event){event.preventDefault();setBusy(true);setMessage('');try{
    const response=await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});
    const result=await response.json();if(!response.ok)throw new Error(result.error);
    setDraft({name:'',email:'',password:'',role:'GESTIONNAIRE'});setMessage('Compte créé. Le collaborateur peut se connecter avec ses identifiants.');
  }catch(error){setMessage(error.message||'Création impossible.');}finally{setBusy(false);}}
  return <section className="panel below"><div className="panelhead"><b>Créer un accès collaborateur</b></div><form className="operation-form" onSubmit={submit}>
    {['name','email','password'].map(key=><label key={key}>{key==='name'?'Nom complet':key==='email'?'Email':'Mot de passe initial'}<input required type={key==='name'?'text':key} minLength={key==='password'?12:undefined} autoComplete={key==='password'?'new-password':undefined} value={draft[key]} onChange={event=>setDraft({...draft,[key]:event.target.value})}/></label>)}
    <label>Rôle<select value={draft.role} onChange={event=>setDraft({...draft,role:event.target.value})}><option value="GESTIONNAIRE">Gestionnaire</option><option value="DIRECTION">Direction</option></select></label>
    <button className="primary" disabled={busy}>{busy?'Création en cours…':'Créer le compte'}</button>{message&&<p role="status">{message}</p>}
  </form></section>;
}
