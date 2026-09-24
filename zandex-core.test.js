import test from 'node:test';
import assert from 'node:assert/strict';
import { ZandExCore } from './zandex-core.js';

test('une affectation retire le stock du bureau et crédite celui de l’agent', () => {
  const core=new ZandExCore();
  core.move({productId:'p1',to:'office',quantity:10,actor:'direction',type:'OPENING'});
  core.assignAgent({agentId:'jesse',lines:[{productId:'p1',quantity:4}],actor:'gestionnaire'});
  assert.equal(core.quantity('office','p1'),6);
  assert.equal(core.quantity('agent/jesse','p1'),4);
});

test('un inventaire avec écart exige une justification', () => {
  const core=new ZandExCore();
  core.move({productId:'p1',to:'office',quantity:10,actor:'direction',type:'OPENING'});
  assert.throws(()=>core.inventory({location:'office',lines:[{productId:'p1',physicalQuantity:8}],actor:'gestionnaire'}));
});

test('un rapport multi-produits réduit le stock de l’agent', () => {
  const core=new ZandExCore();
  core.move({productId:'p1',to:'agent/jesse',quantity:4,actor:'direction',type:'OPENING'});
  core.move({productId:'p2',to:'agent/jesse',quantity:3,actor:'direction',type:'OPENING'});
  const total=core.dailyReport({agentId:'jesse',actor:'gestionnaire',cashReceived:35000,lines:[{productId:'p1',quantity:2,unitPrice:10000},{productId:'p2',quantity:1,unitPrice:15000}]});
  assert.equal(total,35000);
  assert.equal(core.quantity('agent/jesse','p1'),2);
  assert.equal(core.quantity('agent/jesse','p2'),2);
});
