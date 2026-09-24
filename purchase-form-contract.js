// Contrat de validation du formulaire Achat : utilisé par l'interface avant enregistrement.
export function validatePurchase(draft) {
  const errors=[];
  if (!draft.supplier?.trim()) errors.push('Le fournisseur est obligatoire.');
  if (!draft.date) errors.push('La date d’achat est obligatoire.');
  if (!Array.isArray(draft.lines) || !draft.lines.length) errors.push('Ajoutez au moins un produit.');
  draft.lines?.forEach((line,index)=> {
    if (!line.productId) errors.push(`Ligne ${index+1} : produit obligatoire.`);
    if (!(line.quantity>0)) errors.push(`Ligne ${index+1} : quantité invalide.`);
    if (!(line.purchasePrice>=0)) errors.push(`Ligne ${index+1} : prix d’achat invalide.`);
  });
  return {valid:errors.length===0,errors,total:(draft.lines||[]).reduce((sum,x)=>sum+x.quantity*x.purchasePrice,0)};
}
