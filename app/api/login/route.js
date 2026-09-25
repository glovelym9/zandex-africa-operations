import {cookies} from 'next/headers';
import {db} from '../../lib/db.js';
import {createSession, verifyPassword} from '../../lib/session.js';

export async function POST(request) {
  try {
    const {email, password} = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return Response.json({error: 'Identifiants invalides.'}, {status: 400});
    }
    const user = await db.user.findUnique({where: {email: email.trim().toLowerCase()}});
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json({error: 'Email ou mot de passe incorrect.'}, {status: 401});
    }
    const session = await createSession(db, user.id);
    (await cookies()).set('zandex_session', session.token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
      path: '/', expires: session.expiresAt,
    });
    return Response.json({user: {id: user.id, name: user.name, email: user.email, role: user.role}});
  } catch {
    return Response.json({error: 'Connexion indisponible.'}, {status: 500});
  }
}
