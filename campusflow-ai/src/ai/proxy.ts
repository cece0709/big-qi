import { validateTaskDraft } from '../core/tasks';
import { readNDJSON } from './protocol';
import { abortError, throwIfAborted } from './types';
import type { AIProvider, AIStreamEvent, ChatRequest, ExtractRequest, FetchLike } from './types';
// Avoid loading native modules in Node tests; Expo fetch provides actual mobile streaming.
const expoFetch: FetchLike = async (url, init) => {
  const { fetch } = await import('expo/fetch');
  return await fetch(url, init) as unknown as Response;
};
function withDeadline(signal?: AbortSignal) {
  const controller = new AbortController(); const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 65000);
  return { signal: controller.signal, cancel: abort, cleanup: () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); } };
}
async function responseError(response: Response): Promise<string> {
  const fallback = response.status === 429 ? '请求过于频繁，请稍后再试' : `AI代理请求失败（${response.status}）`;
  try {
    const data: unknown = await response.json();
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') return data.error.slice(0, 240);
  } catch { /* Do not display raw HTML error pages. */ }
  return fallback;
}
export class ProxyAIProvider implements AIProvider {
  readonly mode = 'api' as const; private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly fetchImpl: FetchLike = expoFetch) {
    const parsed = new URL(baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('请输入有效的代理服务 HTTP(S) 地址');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }
  async *streamChat(request: ChatRequest): AsyncGenerator<AIStreamEvent> {
    throwIfAborted(request.signal); const deadline = withDeadline(request.signal);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' }, signal: deadline.signal,
        body: JSON.stringify({ persona: request.persona, messages: request.messages.filter((item) => item.role !== 'system').slice(-40) }),
      });
      if (!response.ok) { yield { type: 'error', message: await responseError(response) }; return; }
      if (!response.body) { yield { type: 'error', message: '当前连接未返回流式响应' }; return; }
      for await (const event of readNDJSON(response.body)) {
        throwIfAborted(request.signal); yield event;
        if (event.type === 'done' || event.type === 'error') return;
      }
      yield { type: 'error', message: 'AI连接意外中断，请重新发送' };
    } catch {
      if (request.signal?.aborted) throw abortError();
      yield { type: 'error', message: deadline.signal.aborted ? 'AI请求超时，请重试' : '无法连接AI代理，请检查网络和服务地址' };
    } finally { deadline.cancel(); deadline.cleanup(); }
  }
  async extractTask(request: ExtractRequest) {
    throwIfAborted(request.signal); const deadline = withDeadline(request.signal);
    try {
      const now = request.now ?? new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const response = await this.fetchImpl(`${this.baseUrl}/api/extract-task`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: deadline.signal,
        body: JSON.stringify({ text: request.text, localDate }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const data: unknown = await response.json(); return validateTaskDraft(data);
    } catch (error) {
      if (request.signal?.aborted) throw abortError();
      if (deadline.signal.aborted) throw new Error('AI提取超时，请重试');
      if (error instanceof TypeError) throw new Error('无法连接AI代理，请检查网络和服务地址');
      throw error;
    } finally { deadline.cancel(); deadline.cleanup(); }
  }
}

