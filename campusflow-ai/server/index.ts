import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listenCampusFlow } from './app';

function loadEnv(path:string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path,'utf8').split(/\r?\n/)) {
    const match=line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]!]) continue;
    const raw=match[2]!.replace(/^['"]|['"]$/g,'');
    process.env[match[1]!]=raw;
  }
}
loadEnv(resolve(process.cwd(),'server','.env'));
const port=Number(process.env.PORT ?? 8787);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT 必须是 1–65535');
const provider=(process.env.AI_PROVIDER ?? 'openai').trim().toLowerCase();
if(provider!=='openai'&&provider!=='grok')throw new Error('AI_PROVIDER 只能是 openai 或 grok');
const apiKey=process.env.AI_API_KEY ?? (provider==='grok'?process.env.XAI_API_KEY:process.env.OPENAI_API_KEY);
const model=process.env.AI_MODEL ?? (provider==='grok'?'grok-4.7':'gpt-4o-mini');
const baseUrl=process.env.AI_BASE_URL ?? (provider==='grok'?'https://api.x.ai':'https://api.openai.com');
listenCampusFlow({apiKey,model,baseUrl},port);
console.log('CampusFlow AI proxy listening on http://127.0.0.1:' + port + ' (provider: ' + provider + ', key configured: ' + Boolean(apiKey) + ')');
