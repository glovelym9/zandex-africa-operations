'use client';

import {useState} from 'react';
import '../workspace.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password})});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Connexion impossible.');
      window.location.reload();
    } catch (failure) {setError(failure.message); setBusy(false);}
  }
  return <main className="login-layout"><div className="login-story"><div className="login-mark"><span>Zand</span>Ex <small>AFRICA</small></div><p className="login-kicker">BUREAU · DISTRIBUTION · TRAÇABILITÉ</p><h1>Chaque marchandise.<br/>Chaque mouvement.<br/><em>Une preuve.</em></h1><p>La gestion opérationnelle de ZandEx, du stock général à la clôture de caisse.</p></div><section className="login-panel"><div className="login-panel-inner"><span className="eyebrow">ACCÈS SÉCURISÉ</span><h2>Ouvrir votre espace</h2><p>Connectez-vous avec le compte fourni par la Direction.</p><form onSubmit={submit}><label>Adresse e-mail<input type="email" autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Mot de passe<input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label><button className="primary" disabled={busy}>{busy?'Connexion en cours…':'Se connecter'}</button>{error&&<div className="form-error" role="alert">{error}</div>}</form><small>Accès réservé aux utilisateurs autorisés · ZandEx Africa</small></div></section></main>;
}
