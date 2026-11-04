const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
async function load(file){return import('data:text/javascript;base64,'+fs.readFileSync(require('node:path').join(__dirname,'..',file)).toString('base64'));}
test('shipping settings accept AED amounts and map to database columns',async()=>{
 const {validateShippingSettings,mapShippingSettings}=await load('lib/supabase/data.js');
 const row=validateShippingSettings({standard:'25',express:50.5,freeThreshold:0.29});
 assert.deepEqual(row,{standard_delivery_aed:25,express_delivery_aed:50.5,free_shipping_threshold_aed:0.29});
 assert.deepEqual(mapShippingSettings(row),{standard:25,express:50.5,freeThreshold:0.29});
 for(const bad of [{standard:-1,express:5,freeThreshold:5},{standard:1.234,express:5,freeThreshold:5},{standard:1,express:'x',freeThreshold:5},{standard:1,express:5},{standard:1,express:5,freeThreshold:100001},{standard:null,express:5,freeThreshold:5},{standard:'',express:5,freeThreshold:5},null]) assert.equal(validateShippingSettings(bad),null);
});
test('order numbers match the database format only',async()=>{
 const {orderNumberPattern}=await load('lib/supabase/data.js');
 assert.ok(orderNumberPattern.test('Y-1A2B3C4D'));
 for(const bad of ['y-1a2b3c4d','Y-123456','Y-1A2B3C4DE','Y-1A2B3C4G',"Y-1A2B3C4D' or 1=1"]) assert.equal(orderNumberPattern.test(bad),false);
});
