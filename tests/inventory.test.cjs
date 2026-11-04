const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
async function load(file){return import('data:text/javascript;base64,'+fs.readFileSync(require('node:path').join(__dirname,'..',file)).toString('base64'));}
test('variant quantities are isolated and missing variants unavailable',async()=>{
 const {getVariantStock}=await load('lib/products.js');
 const p={stock:9,variant_stock:{'Black|M':2,'White|L':7}};
 assert.equal(getVariantStock(p,'M','Black'),2);
 assert.equal(getVariantStock(p,'L','White'),7);
 assert.equal(getVariantStock(p,'S','Black'),0);
});
test('product validation rejects malformed inventory and computes total',async()=>{
 const {validateProduct}=await load('lib/supabase/data.js');
 const p={name:'Test',cat:'hoodies',price:100,stock:999,colors:[['Black','#111111']],variant_stock:{'Black|M':3}};
 assert.equal(validateProduct(p).stock,3);
 for(const variants of [{'Black|M':-1},{'Black|M':1.5},{'Blue|M':1},{'Black|ONE SIZE':1},{'Black|M|x':1}]) assert.equal(validateProduct({...p,variant_stock:variants}),null);
 assert.equal(validateProduct({...p,cat:'caps'}),null);
});
