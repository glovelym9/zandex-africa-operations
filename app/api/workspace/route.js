import {cookies, headers} from 'next/headers';
import {db} from '../../lib/db.js';
import {resolveSession} from '../../lib/session.js';
import {assertAccess} from '../../lib/access.js';

async function currentUser() {
  return resolveSession(db, (await cookies()).get('zandex_session')?.value);
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({error: 'Session expirée ou absente.'}, {status: 401});
  const [products, suppliers, agents, locations, balances, purchases, sales, expenses, cash, movements] = await Promise.all([
    db.product.findMany({orderBy: {name: 'asc'}}),
    db.supplier.findMany({orderBy: {name: 'asc'}}),
    db.agent.findMany({orderBy: {name: 'asc'}}),
    db.stockLocation.findMany({orderBy: {label: 'asc'}}),
    db.stockBalance.findMany(),
    db.purchase.findMany({orderBy: {createdAt: 'desc'}, take: 100, include: {lines: true}}),
    db.sale.findMany({orderBy: {createdAt: 'desc'}, take: 100, include: {lines: true}}),
    db.expense.findMany({orderBy: {createdAt: 'desc'}, take: 100}),
    db.cashMovement.findMany({orderBy: {createdAt: 'desc'}, take: 200}),
    db.stockMovement.findMany({orderBy: {createdAt: 'desc'}, take: 200}),
  ]);
  return Response.json({user, products, suppliers, agents, locations, balances, purchases, sales, expenses, cash, movements});
}

export async function POST(request) {
  const origin = (await headers()).get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({error: 'Origine non autorisée.'}, {status: 403});
  }
  const user = await currentUser();
  if (!user) return Response.json({error: 'Session expirée ou absente.'}, {status: 401});
  let input;
  try { input = await request.json(); }
  catch { return Response.json({error: 'Données JSON invalides.'}, {status: 400}); }
  try {
    const name = input.name?.trim();
    if (!name) return Response.json({error: 'Nom obligatoire.'}, {status: 422});
    let record;
    if (input.kind === 'product') {
      assertAccess(user, 'products');
      const salePrice = Number(input.salePrice);
      const minimumStock = Number(input.minimumStock);
      if (!Number.isFinite(salePrice) || salePrice < 0 || !Number.isInteger(minimumStock) || minimumStock < 0) {
        return Response.json({error: 'Prix ou seuil invalide.'}, {status: 422});
      }
      record = await db.product.create({data: {name, reference: input.reference?.trim() || null, salePrice, minimumStock}});
    } else if (input.kind === 'supplier') {
      assertAccess(user, 'suppliers');
      record = await db.supplier.create({data: {name, phone: input.phone?.trim() || null}});
    } else if (input.kind === 'agent') {
      assertAccess(user, 'agents');
      record = await db.$transaction(async tx => {
        const agent = await tx.agent.create({data: {name, phone: input.phone?.trim() || null}});
        await tx.stockLocation.create({data: {type: 'AGENT', label: `Agent ${agent.id}`, agentId: agent.id}});
        return agent;
      });
    } else return Response.json({error: 'Type de fiche inconnu.'}, {status: 400});
    return Response.json({ok: true, record}, {status: 201});
  } catch (error) {
    if (error.message === 'Accès non autorisé.') return Response.json({error: error.message}, {status: 403});
    return Response.json({error: 'Création impossible. Vérifiez la référence unique et les champs.'}, {status: 422});
  }
}
