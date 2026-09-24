export const formSchema={
  purchase:{title:'Nouvel achat',sections:[['Fournisseur',['supplier']],['Produits',['lines']],['Justificatif',['reference','note']]]},
  assignment:{title:'Affecter du stock',sections:[['Destinataire',['agentId']],['Produits confiés',['lines']],['Validation',['note']]]},
  sale:{title:'Vente directe',sections:[['Client / paiement',['paymentMethod']],['Produits vendus',['lines']],['Validation',['discount','note']]]},
  expense:{title:'Nouvelle dépense',sections:[['Dépense',['category','amount']],['Imputation',['agentId','note']],['Preuve',['reference']]]},
  inventory:{title:'Inventaire',sections:[['Emplacement',['location']],['Comptage physique',['lines']],['Écart et justification',['justification']]]},
  closing:{title:'Clôture journalière',sections:[['Solde initial',['openingBalance']],['Vérification',['note']],['Validation',['proof']]]}
};
