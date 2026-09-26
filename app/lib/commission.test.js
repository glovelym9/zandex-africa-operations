import test from 'node:test';
import assert from 'node:assert/strict';
import {recordCommission} from './operations.js';

const user={id:'manager',role:'DIRECTION'};
test('une commission conserve le montant et son auteur',async()=>{
  const entries=[];
  const db={agent:{findUnique:async()=>({name:'Clarisse',active:true})},cashMovement:{create:async({data})=>{entries.push(data);return data;}}};
  const result=await recordCommission(db,user,{agentId:'agent',salesAmount:1250,rate:7.5});
  assert.equal(result.amount,93.75);
  assert.equal(result.actorId,user.id);
  assert.equal(entries.length,1);
});
test('un taux hors limites ou un agent inactif ne débite pas la caisse',async()=>{
  let writes=0;
  const db={agent:{findUnique:async()=>({active:false})},cashMovement:{create:async()=>{writes++;}}};
  await assert.rejects(recordCommission(db,user,{agentId:'agent',salesAmount:100,rate:101}));
  await assert.rejects(recordCommission(db,user,{agentId:'agent',salesAmount:100,rate:10}));
  assert.equal(writes,0);
});
