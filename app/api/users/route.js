import {cookies} from 'next/headers';
import {db} from '../../lib/db.js';
import {resolveSession,hashPassword} from '../../lib/session.js';

export async function POST(request) {
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origine non autorisée.'},{status:403});
  const user=await resolveSession(db,(await cookies()).get('zandex_session')?.value);
  if(!user)return Response.json({error:'Connexion requise.'},{status:401});
  if(user.role!=='DIRECTION')return Response.json({error:'Accès réservé à la Direction.'},{status:403});
  let input;
  try{input=await request.json();}catch{return Response.json({error:'Données invalides.'},{status:400});}
  const name=typeof input?.name==='string'?input.name.trim():'';
  const email=typeof input?.email==='string'?input.email.trim().toLowerCase():'';
  if(!name||!/^\S+@\S+\.\S+$/.test(email)||!['DIRECTION','GESTIONNAIRE'].includes(input?.role))return Response.json({error:'Nom, email et rôle valides requis.'},{status:422});
  try {
    const passwordHash=hashPassword(input.password);
    const account=await db.user.create({data:{name,email,role:input.role,passwordHash},select:{id:true,name:true,email:true,role:true}});
    return Response.json({ok:true,account},{status:201});
  }catch(error){return Response.json({error:error.code==='P2002'?'Cet email possède déjà un compte.':'Création refusée. Le mot de passe doit contenir au moins 12 caractères.'},{status:422});}
}
