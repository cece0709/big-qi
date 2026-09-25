import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { buildSystemPrompt, extractTaskLocally, validatePersona, validateTaskDraft } from '../src/core';
import type { Persona, TaskDraft } from '../src/core/types';

export type ServerConfig = {
  apiKey?: string; model?: string; baseUrl?: string; now?: () => Date; fetchImpl?: typeof fetch;
};
type ChatMessage = { role:'user' | 'assistant'; content:string };
const maxBody = 256 * 1024;
function sendJson(res:ServerResponse,status:number,payload:unknown) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(payload));
}
function cors(res:ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Vary','Origin');
}
async function body(req:IncomingMessage):Promise<unknown> {
  const chunks:Buffer[]=[];let size=0;
  for await (const chunk of req) { const value=Buffer.from(chunk);size+=value.length;if(size>maxBody)throw new Error('请求内容过大');chunks.push(value); }
  const text=Buffer.concat(chunks).toString('utf8');
  if(!text)throw new Error('请求体不能为空');
  try{return JSON.parse(text) as unknown;}catch{throw new Error('请求体必须是 JSON');}
}
function record(value:unknown):Record<string,unknown> {if(typeof value!=='object'||value===null||Array.isArray(value))throw new Error('请求格式无效');return value as Record<string,unknown>;}
function personaFrom(value:unknown):Persona {
  const validated=validatePersona(value);const now=new Date().toISOString();
  return {...validated,id:'server-persona',createdAt:now,updatedAt:now};
}
function messagesFrom(value:unknown):ChatMessage[] {
  if(!Array.isArray(value)||value.length===0||value.length>40)throw new Error('消息数量应为 1–40 条');
  return value.map((item)=>{const row=record(item);if((row.role!=='user'&&row.role!=='assistant')||typeof row.content!=='string'||!row.content.trim()||row.content.length>4000)throw new Error('消息格式无效');return {role:row.role,content:row.content.trim()};});
}
function ndjson(res:ServerResponse,event:unknown){res.write(JSON.stringify(event)+'\n');}
function safeError(error:unknown){return error instanceof Error ? error.message.slice(0,240) : '服务暂时不可用';}
async function* sseDeltas(stream:ReadableStream<Uint8Array>):AsyncGenerator<string> {
  const reader=stream.getReader();const decoder=new TextDecoder();let buffer='';
  try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const rows=buffer.split(/\r?\n/);buffer=rows.pop()??'';for(const row of rows){if(!row.startsWith('data:'))continue;const data=row.slice(5).trim();if(data==='[DONE]')return;try{const parsed=JSON.parse(data) as {choices?:{delta?:{content?:string}}[]} ;const text=parsed.choices?.[0]?.delta?.content;if(typeof text==='string'&&text)yield text;}catch{/* Ignore non-content events from compatible providers. */}}}buffer+=decoder.decode();}finally{await reader.cancel().catch(()=>undefined);reader.releaseLock();}
}
function outputText(value:unknown):string {
  if(typeof value==='string')return value; if(Array.isArray(value))return value.filter((item):item is {text?:string}=>typeof item==='object'&&item!==null).map((item)=>typeof item.text==='string'?item.text:'').join('');
  return '';
}
async function callJson(config:Required<Pick<ServerConfig,'apiKey'|'model'|'baseUrl'|'fetchImpl'>>, messages:{role:'system'|'user';content:string}[], signal:AbortSignal):Promise<string> {
  const response=await config.fetchImpl(config.baseUrl.replace(/\/$/,'')+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${config.apiKey}`},body:JSON.stringify({model:config.model,messages,temperature:.2,response_format:{type:'json_object'}}),signal});
  if(!response.ok)throw new Error(`上游 AI 服务错误（${response.status}）`);
  const json=await response.json() as {choices?:{message?:{content?:unknown}}[]} ;
  const content=outputText(json.choices?.[0]?.message?.content);
  if(!content)throw new Error('上游 AI 未返回有效结果');
  return content;
}
export function createCampusFlowServer(config:ServerConfig={}) {
  const apiKey=config.apiKey??'';const model=config.model??'gpt-4o-mini';const baseUrl=config.baseUrl??'https://api.openai.com';const fetchImpl=config.fetchImpl??fetch;const now=config.now??(()=>new Date());
  const hits=new Map<string,{started:number;count:number}>();
  const limited=(req:IncomingMessage)=>{const key=req.socket.remoteAddress??'local';const time=Date.now();const entry=hits.get(key);if(!entry||time-entry.started>60_000){hits.set(key,{started:time,count:1});return false;}entry.count+=1;return entry.count>30;};
  const handler=async(req:IncomingMessage,res:ServerResponse)=>{
    cors(res);if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    if(req.url==='/api/health'&&req.method==='GET'){sendJson(res,200,{status:'ok',providerConfigured:Boolean(apiKey),mode:apiKey?'api':'mock-required'});return;}
    if(limited(req)){sendJson(res,429,{error:'请求过于频繁，请稍后再试'});return;}
    try{
      if(req.url==='/api/extract-task'&&req.method==='POST'){
        const payload=record(await body(req));if(typeof payload.text!=='string'||!payload.text.trim()||payload.text.length>4000)throw new Error('text 必须是 1–4000 字');
        const localDate=typeof payload.localDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(payload.localDate)?new Date(payload.localDate+'T12:00:00'):now();
        let result:TaskDraft;
        if(!apiKey){result=extractTaskLocally(payload.text,localDate);}
        else{
          const raw=await callJson({apiKey,model,baseUrl,fetchImpl},[{role:'system',content:'你是任务提取器。提取用户文本中的任务，返回严格 JSON：title, description, category(学习/阅读/运动/休息/课程/其他), dueDate(YYYY-MM-DD 或 null), dueTime(HH:mm 或 null), estimatedMinutes(正整数或 null), personaId:null, sourceMessageId:null。不能确定日期或时间时写 null，不得编造。'},{role:'user',content:`当前本地日期：${localDate.toISOString().slice(0,10)}\n文本：${payload.text}`}],new AbortController().signal);
          result=validateTaskDraft(JSON.parse(raw) as unknown);
        }
        sendJson(res,200,result);return;
      }
      if(req.url==='/api/chat'&&req.method==='POST'){
        if(!apiKey){sendJson(res,503,{error:'服务端未配置 OPENAI_API_KEY。请切换 Mock 模式，或在 server/.env 中配置密钥。'});return;}
        const payload=record(await body(req));const persona=personaFrom(payload.persona);const messages=messagesFrom(payload.messages);
        res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
        const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60_000);req.on('close',()=>controller.abort());
        try{
          const response=await fetchImpl(baseUrl.replace(/\/$/,'')+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},body:JSON.stringify({model,stream:true,temperature:.55,messages:[{role:'system',content:buildSystemPrompt(persona)},...messages]}),signal:controller.signal});
          if(!response.ok||!response.body)throw new Error(`上游 AI 服务错误（${response.status}）`);
          for await(const text of sseDeltas(response.body)){ndjson(res,{type:'delta',text});}
          ndjson(res,{type:'done'});
        }catch(error){ndjson(res,{type:'error',message:controller.signal.aborted?'AI 请求超时或已取消，请重试':safeError(error)});}finally{clearTimeout(timeout);res.end();}
        return;
      }
      sendJson(res,404,{error:'接口不存在'});
    }catch(error){sendJson(res,error instanceof Error&&error.message==='请求内容过大'?413:400,{error:safeError(error)});}
  };
  return createServer((req,res)=>{void handler(req,res);});
}
export function listenCampusFlow(config:ServerConfig,port:number):Server { const server=createCampusFlowServer(config);server.listen(port);return server; }

