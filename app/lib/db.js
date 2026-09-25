import {PrismaClient} from '@prisma/client';

const globalDb = globalThis;
export const db = globalDb.zandexDb || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalDb.zandexDb = db;
