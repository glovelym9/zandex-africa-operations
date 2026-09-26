import test from 'node:test';
import assert from 'node:assert/strict';
import {recordSale} from './operations.js';
test('un gestionnaire ne peut pas accorder de remise sans Direction',async()=>{
  let writes=0;
  const db={$transaction:async()=>{writes++;}};
  await assert.rejects(recordSale(db,{id:'manager',role:'GESTIONNAIRE'},{locationId:'office',cashReceived:9,lines:[{productId:'product',quantity:1,discount:1}]}),/Accès/);
  assert.equal(writes,0);
});
