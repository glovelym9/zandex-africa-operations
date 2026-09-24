import { formSchema } from './form-schema.js';

const labels={supplier:'Fournisseur',agentId:'Agent',reference:'Référence',note:'Observations',paymentMethod:'Mode de paiement',discount:'Réduction',category:'Catégorie',amount:'Montant',location:'Emplacement',justification:'Justification de l’écart',openingBalance:'Solde d’ouverture',proof:'Preuve / référence'};

export function renderForm(kind) {
  const definition=formSchema[kind];
  if (!definition) throw new Error('Formulaire inconnu');
  return `<form data-form="${kind}"><h2>${definition.title}</h2>${definition.sections.map(([title,fields])=>`<fieldset><legend>${title}</legend>${fields.map(field=>field==='lines'?'<div class="line-editor" data-lines></div><button type="button" data-add-line>Ajouter une ligne</button>':`<label>${labels[field]||field}<input name="${field}" /></label>`).join('')}</fieldset>`).join('')}<button type="submit">Valider et tracer</button></form>`;
}
