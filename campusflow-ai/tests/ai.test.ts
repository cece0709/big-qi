import { describe, expect, it } from 'vitest';
import { MockAIProvider, ProxyAIProvider } from '../src/ai';
import { createExamplePersonas } from '../src/core';
import { readNDJSON } from '../src/ai/protocol';

describe('AI providers',()=>{
  it('streams a safe mock reply without a key',async()=>{
    const provider=new MockAIProvider(0);const persona=createExamplePersonas()[0]!;
    const events=[];for await(const event of provider.streamChat({persona,messages:[{role:'user',content:'明天下午三点复习高数一小时'}]}))events.push(event);
    expect(events.some((event)=>event.type==='delta')).toBe(true);
    expect(events.at(-1)).toEqual({type:'done'});
    const task=await provider.extractTask({text:'明天下午三点复习高数一小时',now:new Date('2026-09-18T08:00:00')});
    expect(task.dueTime).toBe('15:00');
  });
  it('parses NDJSON across arbitrary byte chunks',async()=>{
    const payload=['{"type":"delta","text":"你好"}','{"type":"done"}',''].join('\n');
    const encoder=new TextEncoder();const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(encoder.encode(payload.slice(0,13)));controller.enqueue(encoder.encode(payload.slice(13)));controller.close();}});
    const rows=[];for await(const row of readNDJSON(stream))rows.push(row);
    expect(rows).toEqual([{type:'delta',text:'你好'},{type:'done'}]);
  });
  it('rejects unsafe proxy base URLs',()=>{
    expect(()=>new ProxyAIProvider('ftp://example.com')).toThrow('有效的代理');
  });
});
