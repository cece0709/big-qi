import type { AIStreamEvent } from './types';
export function parseStreamEvent(line: string): AIStreamEvent {
  let data: unknown;
  try { data = JSON.parse(line); } catch { throw new Error('服务端返回了无效的数据流'); }
  if (typeof data !== 'object' || data === null) throw new Error('服务端返回了无效的数据流');
  const event = data as Record<string, unknown>;
  if (event.type === 'delta' && typeof event.text === 'string' && event.text.length <= 32000) return { type: 'delta', text: event.text };
  if (event.type === 'done') return { type: 'done' };
  if (event.type === 'error' && typeof event.message === 'string') return { type: 'error', message: event.message.slice(0, 240) };
  throw new Error('服务端返回了未知的数据类型');
}
/** Preserve UTF-8 across arbitrary network chunk boundaries. */
export async function* readNDJSON(body: ReadableStream<Uint8Array>): AsyncGenerator<AIStreamEvent> {
  const reader = body.getReader(); const decoder = new TextDecoder();
  let pending = ''; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 512 * 1024) throw new Error('AI回复过长，请缩短问题后重试');
      pending += decoder.decode(value, { stream: true });
      let separator = pending.indexOf('\n');
      while (separator !== -1) {
        const line = pending.slice(0, separator).trim(); pending = pending.slice(separator + 1);
        if (line) yield parseStreamEvent(line);
        separator = pending.indexOf('\n');
      }
    }
    pending += decoder.decode();
    if (pending.trim()) yield parseStreamEvent(pending.trim());
  } finally {
    await reader.cancel().catch(() => undefined); reader.releaseLock();
  }
}

