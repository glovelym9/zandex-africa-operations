import {cookies} from 'next/headers';
import {db} from '../../lib/db.js';
import {hashToken} from '../../lib/session.js';

export async function POST() {
  const jar = await cookies();
  const token = jar.get('zandex_session')?.value;
  if (token) await db.session.deleteMany({where: {tokenHash: hashToken(token)}});
  jar.delete('zandex_session');
  return Response.json({ok: true});
}
