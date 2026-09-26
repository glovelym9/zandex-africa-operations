'use client';

import {useCallback, useEffect, useState} from 'react';
import {Dashboard, Catalog, Purchases, Stock, Sales, Finance, Inventory, Reports} from './WorkspaceModules.js';
import CommissionForm from './CommissionForm.js';
import ReportsPeriod from './ReportsPeriod.js';
import StaffAccounts from './StaffAccounts.js';
import '../workspace.css';

const NAV = [
  ['dashboard', 'Vue d’ensemble', 'PILOTAGE'],
  ['catalog', 'Référentiels', 'RÉFÉRENTIELS'],
  ['purchases', 'Achats fournisseur', 'FLUX MARCHANDISES'],
  ['stock', 'Stocks & affectations', 'FLUX MARCHANDISES'],
  ['sales', 'Rapports & ventes', 'FLUX MARCHANDISES'],
  ['finance', 'Caisse & clôture', 'CONTRÔLE'],
  ['inventory', 'Inventaires', 'CONTRÔLE'],
  ['reports', 'Journal & rapports', 'CONTRÔLE'],
];

export default function Workspace({user}) {
  const [view, setView] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [menu, setMenu] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/workspace', {cache: 'no-store'});
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Chargement des données impossible.');
    setData(payload);
  }, []);

  useEffect(() => {
    let active = true;
    load().catch(error => {if (active) setNotice({kind: 'error', text: error.message});})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [load]);

  async function submit(url, payload, success) {
    if (busy) return false;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'L’opération a été refusée.');
      await load();
      setNotice({kind: 'success', text: success});
      return true;
    } catch (error) {
      setNotice({kind: 'error', text: error.message});
      return false;
    } finally {setBusy(false);}
  }

  const operation = (action, payload, success) => submit('/api/operations', {action, data: payload}, success);
  const create = (payload, success) => submit('/api/workspace', payload, success);
  async function logout() {await fetch('/api/logout', {method: 'POST'}); window.location.reload();}
  function go(next) {setView(next); setMenu(false); setNotice(null);}
  const current = NAV.find(item => item[0] === view);
  const props = {data, busy, operation, create, go, user};
  const module = {
    dashboard: <Dashboard {...props}/>, catalog: <><Catalog {...props}/>{user.role==='DIRECTION'&&<StaffAccounts/>}</>, purchases: <Purchases {...props}/>,
    stock: <Stock {...props}/>, sales: <Sales {...props}/>, finance: <><Finance {...props}/><CommissionForm {...props}/></>,
    inventory: <Inventory {...props}/>, reports: <ReportsPeriod {...props}/>,
  }[view];

  return <main className="shell connected-shell"><button className="mobile-menu" type="button" onClick={()=>setMenu(!menu)} aria-label="Afficher les modules" aria-expanded={menu}>☰</button><aside className={menu?'opened':''}><div className="brand"><span>Zand</span>Ex<small>AFRICA · OPERATIONS</small></div><div className="office"><b>BUREAU PRINCIPAL</b><br/>Circuit marchandises & caisse</div><nav aria-label="Modules">{NAV.filter(item=>user.role==='DIRECTION'||!['catalog','purchases'].includes(item[0])).map(([key,label,group],index,array)=><div key={key}>{(index===0||array[index-1][2]!==group)&&<div className="nav-group">{group}</div>}<button type="button" className={view===key?'active':''} onClick={()=>go(key)}>{label}</button></div>)}</nav><footer><b>{user.name}</b><br/><span>{user.role==='DIRECTION'?'Direction':'Gestionnaire'}</span><button type="button" className="logout" onClick={logout}>Se déconnecter</button></footer></aside><section className="workspace"><header><div><b>{current[1].toUpperCase()}</b><small>{new Intl.DateTimeFormat('fr-FR',{dateStyle:'full'}).format(new Date())} · Bureau principal</small></div><span className="live"><i/> Données partagées</span></header><div className="content">{notice&&<div className={'toast '+(notice.kind==='error'?'toast-error':'')} role={notice.kind==='error'?'alert':'status'}>{notice.text}<button type="button" onClick={()=>setNotice(null)} aria-label="Fermer">×</button></div>}{loading?<div className="loading-rows" role="status" aria-live="polite"><span>Chargement des données du bureau…</span><i/><i/><i/></div>:data?module:<div className="panel empty"><b>Connexion aux données indisponible</b><p>Réessayez le chargement. Aucune opération locale ne sera enregistrée.</p><button className="primary" onClick={()=>{setLoading(true);load().finally(()=>setLoading(false));}}>Réessayer</button></div>}</div></section></main>;
}
