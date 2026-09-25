import {cookies} from 'next/headers';
import {db} from './lib/db.js';
import {resolveSession} from './lib/session.js';
import Workspace from './components/Workspace.js';
import Login from './components/Login.js';

export default async function Page() {
  const token = (await cookies()).get('zandex_session')?.value;
  const user = await resolveSession(db, token);
  return user ? <Workspace user={user}/> : <Login/>;
}
