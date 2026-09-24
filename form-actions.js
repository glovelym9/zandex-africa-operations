import { ZandExCore } from './zandex-core.js';
import { validatePurchase } from './purchase-form-contract.js';
import { validateAssignment } from './stock-assignment-contract.js';

export const core = new ZandExCore();
export const catalog={products:[],suppliers:[],agents:[]};

export function createProduct(draft) {
  if (!draft.name?.trim() || !(draft.salePrice >= 0) || !(draft.minimumStock >= 0)) return {valid:false,errors:['Nom, prix de vente et seuil minimum sont obligatoires.']};
  const product={id:crypto.randomUUID(),name:draft.name.trim(),reference:draft.reference?.trim()||null,salePrice:draft.salePrice,minimumStock:draft.minimumStock,active:true};
  catalog.products.push(product); return {valid:true,product};
}

export function createSupplier(draft) {
  if (!draft.name?.trim()) return {valid:false,errors:['Le nom du fournisseur est obligatoire.']};
  const supplier={id:crypto.randomUUID(),name:draft.name.trim(),phone:draft.phone?.trim()||null,active:true};
  catalog.suppliers.push(supplier); return {valid:true,supplier};
}

export function createAgent(draft) {
  if (!draft.name?.trim()) return {valid:false,errors:['Le nom de l’agent est obligatoire.']};
  const agent={id:crypto.randomUUID(),name:draft.name.trim(),phone:draft.phone?.trim()||null,status:'active',joinedAt:new Date().toISOString()};
  catalog.agents.push(agent); return {valid:true,agent};
}

export function submitPurchase(draft, actor) {
  const check=validatePurchase(draft);
  if (!check.valid) return check;
  core.purchase({supplier:draft.supplier,lines:draft.lines.map(x=>({productId:x.productId,quantity:x.quantity})),actor});
  return {valid:true,total:check.total,receipt:'Achat enregistré et stock général mis à jour.'};
}

export function submitAssignment(draft, actor) {
  const check=validateAssignment(draft, productId=>core.quantity('office',productId));
  if (!check.valid) return check;
  core.assignAgent({agentId:draft.agentId,lines:draft.lines,actor});
  return {valid:true,receipt:'Affectation enregistrée et stock de l’agent mis à jour.'};
}

export function submitDailyReport(draft, actor) {
  if (!draft.agentId || !draft.lines?.length) return {valid:false,errors:['Sélectionnez un agent et au moins une vente.']};
  try {
    const total=core.dailyReport({...draft,actor});
    return {valid:true,total,receipt:'Rapport validé, ventes et encaissement enregistrés.'};
  } catch (error) { return {valid:false,errors:[error.message]}; }
}

export function submitExpense(draft, actor) {
  if (!draft.category || !(draft.amount > 0) || !draft.note?.trim()) return {valid:false,errors:['Catégorie, montant et motif sont obligatoires.']};
  core.expense({...draft,actor});
  return {valid:true,receipt:'Dépense enregistrée dans la trésorerie et le journal.'};
}

export function submitInventory(draft, actor) {
  if (!draft.location || !draft.lines?.length) return {valid:false,errors:['Emplacement et lignes d’inventaire obligatoires.']};
  try { return {valid:true,records:core.inventory({...draft,actor}),receipt:'Inventaire validé et écarts tracés.'}; }
  catch (error) { return {valid:false,errors:[error.message]}; }
}

export function submitDayClosing(draft, actor) {
  if (!(draft.openingBalance >= 0)) return {valid:false,errors:['Solde d’ouverture invalide.']};
  return {valid:true,closing:core.closeDay({...draft,actor}),receipt:'Journée clôturée ; le solde servira d’ouverture suivante.'};
}
