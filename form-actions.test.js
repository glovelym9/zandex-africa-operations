import test from 'node:test';
import assert from 'node:assert/strict';
import { submitExpense, submitPurchase } from './form-actions.js';

test('un achat incomplet est refusé avant toute entrée de stock', () => {
  const result=submitPurchase({supplier:'',date:'2026-09-24',lines:[]},'direction');
  assert.equal(result.valid,false);
});

test('une dépense sans motif est refusée', () => {
  const result=submitExpense({category:'Transport',amount:5000,note:''},'gestionnaire');
  assert.equal(result.valid,false);
});
