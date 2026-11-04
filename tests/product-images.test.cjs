const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
async function load(file){return import('data:text/javascript;base64,'+fs.readFileSync(path.join(__dirname,'..',file)).toString('base64'));}
test('cards preserve the exact saved image; custom images survive colour selection',async()=>{
 const {getProductImage}=await load('lib/products.js');
 for(const img of ['https://example.com/new-product.webp','/images/custom-hoodie.png','/images/products/enhanced/hoodies/custom_design.png']){
  const p={cat:'hoodies',img};
  assert.equal(getProductImage(p),img);
  assert.equal(getProductImage(p,'White'),img);
 }
 const saved='/images/products/enhanced/hoodies/hoodies_pink.png';
 assert.equal(getProductImage({cat:'hoodies',img:saved}),saved);
});
test('bundled colour changes use existing files and fall back for missing colours',async()=>{
 const {getProductImage}=await load('lib/products.js');
 const hoodie={cat:'hoodies',img:'/images/products/enhanced/hoodies/hoodies_black.png'};
 assert.equal(getProductImage(hoodie,'White'),'/images/products/enhanced/hoodies/hoodies_white.png');
 for(const [cat,name,color] of [['caps','caps','Beige'],['headbands','headbands','Olive Green']]){
  const p={cat,img:`/images/products/enhanced/${name}/${name}_black.png`};
  assert.equal(getProductImage(p,color),p.img);
 }
});
test('server rejects machine-local paths and insecure or executable image URLs',async()=>{
 const {validateProduct}=await load('lib/supabase/data.js');
 const p={name:'Demo',cat:'hoodies',price:100,stock:1,colors:[['Black','#111111']],variant_stock:{'Black|M':1}};
 for(const img of ['C:\\photos\\test.jpg','file:///photos/test.jpg','http://example.com/a.jpg','javascript:alert(1)','//example.com/a.jpg'])assert.equal(validateProduct({...p,img}),null);
 for(const img of ['/images/story.jpg','https://example.com/product.png'])assert.ok(validateProduct({...p,img}));
});
