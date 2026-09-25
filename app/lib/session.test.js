import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword, verifyPassword, createSession, resolveSession, hashToken} from './session.js';

test('les mots de passe sont salés et vérifiés', () => {
  const a = hashPassword('mot-de-passe-long');
  const b = hashPassword('mot-de-passe-long');
  assert.notEqual(a, b);
  assert.equal(verifyPassword('mot-de-passe-long', a), true);
  assert.equal(verifyPassword('mot-de-passe-faux', a), false);
  assert.equal(verifyPassword('x', 'invalid'), false);
});

test('la session ne stocke que le hash du jeton et expire', async () => {
  let record;
  const db = {session: {
    async create({data}) {record = {...data, user: {id: data.userId, name: 'Marie', email: 'm@example.com', role: 'DIRECTION'}};},
    async findUnique({where}) {return where.tokenHash === record.tokenHash ? record : null;},
  }};
  const {token} = await createSession(db, 'user-1');
  assert.notEqual(token, record.tokenHash);
  assert.equal(hashToken(token), record.tokenHash);
  assert.equal((await resolveSession(db, token)).role, 'DIRECTION');
  record.expiresAt = new Date(0);
  assert.equal(await resolveSession(db, token), null);
});
