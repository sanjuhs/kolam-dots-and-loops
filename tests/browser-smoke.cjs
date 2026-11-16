const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const baseURL=process.env.BASE_URL||'http://127.0.0.1:8771';
(async()=>{
const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
try {
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(baseURL);
await page.getByRole('button',{name:'Play',exact:true}).click();
assert.equal(await page.evaluate(()=>cur.n),1);
for(let i=0;i<8 && !(await page.evaluate(()=>won));i++)await page.getByRole('button',{name:'Hint',exact:true}).click();
await page.waitForFunction(()=>won);
await page.waitForTimeout(400);
await page.getByRole('button',{name:'Next ›',exact:true}).click();
assert.equal(await page.evaluate(()=>cur.n),2);
await page.getByRole('button',{name:'Back to levels'}).click();
await page.getByRole('button',{name:'‹ Home',exact:true}).filter({visible:true}).click();
await page.getByRole('button',{name:'Rangoli gallery',exact:true}).click();
await page.locator('#galList .card').filter({hasText:'Peacock'}).getByRole('button',{name:'Hard'}).click();
await page.waitForFunction(()=>cur?.kind==='pic');
assert.equal(await page.evaluate(()=>cur.tiles.length),36);
const symmetry=await page.evaluate(async()=>{const out=[];for(let i=0;i<MOTIFS.length;i++)for(const n of [3,4,6]){const lv=await makePic(i,n,1000+i);out.push(lv.tiles.map(c=>[c.sym,c.rot]));}return out;});
await page.evaluate(()=>{while(!won)hint()});await page.waitForTimeout(500);assert(await page.locator('#winBox').isVisible());
await page.getByRole('button',{name:'Next ›',exact:true}).click();await page.waitForFunction(()=>cur?.mi===3);
await page.evaluate(()=>loadMandala(16,6));await page.evaluate(()=>{while(!won)hint()});await page.waitForTimeout(400);assert(await page.locator('#winBox').isVisible());
await page.evaluate(()=>{load(1);note(7,0,.5,.1)});await page.waitForTimeout(800);
assert.equal(await page.evaluate(()=>voices.size),0);
await page.evaluate(()=>{note(7,0,2,.1);Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
await page.waitForFunction(()=>ac.state==='suspended');assert.equal(await page.evaluate(()=>voices.size),0);
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});show('home')});
// HTTPS production registers automatically; localhost needs explicit registration.
if(new URL(baseURL).protocol==='http:')await page.evaluate(()=>navigator.serviceWorker.register('/sw.js'));
await page.evaluate(()=>navigator.serviceWorker.ready);
await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller);
assert.equal(await page.evaluate(()=>doneSet.has(1)),true);
for(let i=0;i<10;i++)await page.evaluate(i=>fetch('/?test='+i),i);
assert.equal(await page.evaluate(async()=>{const c=await caches.open('kolam-v5');return(await c.keys()).length}),8);
await context.setOffline(true);await page.goto(new URL('/?offline=1',baseURL).href);await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>cur?.n>0);
await context.setOffline(false);
assert.equal(symmetry.length,45);assert.deepEqual(errors,[]);
console.log('PASS mobile UI: play, hint, win, next, levels, gallery, hard picture, mandala');
console.log('PASS 45 picture configurations generate');
console.log('PASS audio voices finish and hidden page suspends audio');
console.log('PASS actual service worker: 8 cache keys after query variants, offline reload and play');
console.log('PASS completed levels persist after reload');
console.log('PASS no browser errors');
} finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
