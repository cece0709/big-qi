import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createCampusFlowServer } from '../server/app';

const servers:Server[]=[];
async function start() {
  const server=createCampusFlowServer();
  servers.push(server);await new Promise<void>((resolve)=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();if(!address||typeof address==='string')throw new Error('server address unavailable');
  return `http://127.0.0.1:${address.port}`;
}
afterEach(async()=>{await Promise.all(servers.splice(0).map((server)=>new Promise<void>((resolve)=>server.close(()=>resolve()))));});
describe('AI proxy endpoints',()=>{
  it('reports health without exposing configuration secrets',async()=>{
    const base=await start();const response=await fetch(base+'/api/health');expect(response.status).toBe(200);expect(await response.json()).toMatchObject({status:'ok',providerConfigured:false});
  });
  it('extracts tasks locally without an API key',async()=>{
    const base=await start();const response=await fetch(base+'/api/extract-task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'明天下午三点复习高数一小时',localDate:'2026-09-18'})});
    expect(response.status).toBe(200);expect(await response.json()).toMatchObject({title:'复习高数',dueDate:'2026-09-19',dueTime:'15:00',estimatedMinutes:60});
  });
  it('fails real chat clearly when the server lacks a secret',async()=>{
    const base=await start();const response=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({persona:{name:'测试'},messages:[{role:'user',content:'你好'}]})});
    expect(response.status).toBe(503);expect((await response.json() as {error:string}).error).toContain('OPENAI_API_KEY');
  });
});
