import {randomBytes, scryptSync, timingSafeEqual, createHash} from 'node:crypto';

const SESSION_DAYS = 7;

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Mot de passe trop court (12 caractères minimum).');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [algorithm, salt, hex] = stored.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hex || '')) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hex, 'hex'));
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(db, userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({data: {tokenHash: hashToken(token), userId, expiresAt}});
  return {token, expiresAt};
}

export async function resolveSession(db, token) {
  if (!token) return null;
  const session = await db.session.findUnique({where: {tokenHash: hashToken(token)}, include: {user: true}});
  if (!session || session.expiresAt <= new Date()) return null;
  return {id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role};
}
