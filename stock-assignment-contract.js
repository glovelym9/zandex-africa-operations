export function validateAssignment({agentId, lines}, available) {
  const errors=[];
  if (!agentId) errors.push('Sélectionnez un agent destinataire.');
  if (!lines?.length) errors.push('Ajoutez au moins un produit à affecter.');
  lines?.forEach((line, index) => {
    if (!line.productId) errors.push(`Ligne ${index + 1} : produit obligatoire.`);
    if (!(line.quantity > 0)) errors.push(`Ligne ${index + 1} : quantité invalide.`);
    const stock=available(line.productId);
    if (line.quantity > stock) errors.push(`Ligne ${index + 1} : stock insuffisant (${stock} disponible).`);
  });
  return {valid:!errors.length, errors};
}
