import {PrismaClient} from '@prisma/client';
import {hashPassword} from '../app/lib/session.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || 'Direction ZandEx';
if (!process.env.DATABASE_URL || !email || !password) {
  throw new Error('DATABASE_URL, ADMIN_EMAIL et ADMIN_PASSWORD sont requis.');
}
const db = new PrismaClient();
try {
  if (await db.user.count()) throw new Error('Initialisation refusée : un compte existe déjà.');
  await db.$transaction(async tx => {
    await tx.user.create({data: {email, name, role: 'DIRECTION', passwordHash: hashPassword(password)}});
    await tx.stockLocation.create({data: {type: 'GENERAL', label: 'Stock général'}});
    await tx.stockLocation.create({data: {type: 'BUREAU', label: 'Bureau principal'}});
  });
  process.stdout.write('Compte Direction et emplacements initiaux créés.\n');
} finally {
  await db.$disconnect();
}
