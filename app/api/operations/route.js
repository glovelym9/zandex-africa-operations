import {cookies, headers} from 'next/headers';
import {db} from '../../lib/db.js';
import {resolveSession} from '../../lib/session.js';
import {createPurchase, transferStock, recordSale, recordExpense, countInventory, recordDeposit, closeDay} from '../../lib/operations.js';

const handlers = {
  purchase: createPurchase,
  transfer: transferStock,
  sale: recordSale,
  expense: recordExpense,
  inventory: countInventory,
  deposit: recordDeposit,
  closing: closeDay,
};

export async function POST(request) {
  const origin = (await headers()).get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({error: 'Origine non autorisée.'}, {status: 403});
  }
  const token = (await cookies()).get('zandex_session')?.value;
  const user = await resolveSession(db, token);
  if (!user) return Response.json({error: 'Session expirée ou absente.'}, {status: 401});
  let payload;
  try { payload = await request.json(); }
  catch { return Response.json({error: 'Données JSON invalides.'}, {status: 400}); }
  if (!payload || !Object.hasOwn(handlers, payload.action)) {
    return Response.json({error: 'Action inconnue.'}, {status: 400});
  }
  try {
    const result = await handlers[payload.action](db, user, payload.data || {});
    return Response.json({ok: true, result});
  } catch (error) {
    if (error.message === 'Accès non autorisé.') {
      return Response.json({error: error.message}, {status: 403});
    }
    if (/Stock insuffisant|invalide|requis|justification|dépasse|introuvable|incompatible|distincts|clôturée|dernière/.test(error.message)) {
      return Response.json({error: error.message}, {status: 422});
    }
    return Response.json({error: 'Opération impossible. Aucune écriture validée.'}, {status: 500});
  }
}
