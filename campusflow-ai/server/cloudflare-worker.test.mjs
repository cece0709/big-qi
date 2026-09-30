
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('./cloudflare-worker.js', import.meta.url), 'utf8').replace('export default {', 'globalThis.worker = {');
function setup(responses) {
 let calls = 0;
 const context = vm.createContext({ Response, Request, URL, TextEncoder, TextDecoder, ReadableStream, AbortController, console,
  setTimeout: (fn, ms) => setTimeout(fn, ms < 10000 ? 1 : ms), clearTimeout,
  fetch: async () => { const r = responses[Math.min(calls++, responses.length - 1)]; return typeof r === 'function' ? r() : new Response(r.body || '', {status:r.status}); }
 });
 vm.runInContext(source, context);
 return {worker:context.worker, calls:()=>calls};
}
const good=()=> new Response('data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n');
function request() {return new Request('https://example.com/api/chat',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'test'},body:JSON.stringify({persona:{name:'Test'},messages:[{role:'user',content:'Hello'}]})});}
async function run(responses) {const s=setup(responses); const r=await s.worker.fetch(request(),{GEMINI_API_KEY:'test-only'}); return {s,r,body:await r.text()};}
let a=await run([{status:503},good]); assert.equal(a.s.calls(),2); assert.match(a.body,/"done"/);
a=await run([{status:503}]); assert.equal(a.s.calls(),3); assert.equal(a.r.status,502); assert.match(a.body,/503/);
for (const status of [400,401,403,429]) { a=await run([{status}]); assert.equal(a.s.calls(),1); }
a=await run([()=>new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')]); assert.match(a.body,/"error"/); assert.doesNotMatch(a.body,/"done"/); assert.equal(a.s.calls(),1);
a=await run([()=>new Response('',{status:503,headers:{'Retry-After':'60'}})]); assert.equal(a.s.calls(),1);
const limited=setup([{status:503}]); for(let i=0;i<8;i++) {const r=await limited.worker.fetch(request(),{GEMINI_API_KEY:'test-only'}); await r.text();}
assert.equal(limited.calls(),20);
console.log('PASS: recovery, bounded retries, nonretryable errors, truncated stream, Retry-After, shared rate budget');
