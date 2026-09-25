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
listenCampusFlow({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL,baseUrl:process.env.OPENAI_BASE_URL},port);
console.log(`CampusFlow AI proxy listening on http://127.0.0.1:${port} (key configured: ${Boolean(process.env.OPENAI_API_KEY)})`);
