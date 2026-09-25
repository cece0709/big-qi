import { extractTaskLocally } from '../core/tasks';
import type { AIProvider, AIStreamEvent, ChatRequest, ExtractRequest } from './types';
import { abortError, throwIfAborted } from './types';
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
function mockReply({ persona, messages }: ChatRequest): string {
  const input = [...messages].reverse().find((message) => message.role === 'user')?.content.trim() ?? '';
  const intro = `${persona.userNickname || '同学'}，我是 ${persona.name}，你的 AI 助手。`;
  if (/(自杀|自残|不想活|伤害自己)/.test(input)) return `${intro}听起来你正在经历很难熬的时刻。如果你可能立即伤害自己，请先远离危险物品，联系当地紧急服务，或马上请身边信任的人陪着你。你不需要独自面对。\n\n（Mock 演示回复）`;
  if (/(制造炸弹|未成年.*色情|色情.*未成年|杀人方法|盗取密码)/.test(input)) return `${intro}这个请求涉及可能伤害他人或违法的内容，我无法提供操作方法。我们可以一起寻找安全、合法的替代做法。\n\n（Mock 演示回复）`;
  if (/(诊断|药物剂量|稳赚|投资保证|法律结论)/.test(input)) return `${intro}我不能作出医疗诊断、法律结论或投资保证。可以帮你整理问题与已有资料，方便向具备资质的专业人士咨询。\n\n（Mock 演示回复）`;
  if (/(只有你|不要.*朋友|远离.*家人|离不开你)/.test(input)) return `${intro}我可以帮助你梳理想法，也鼓励你继续与现实中的朋友、家人或老师保持联系。先找一个信任的人聊聊近况，也是很好的下一步。\n\n（Mock 演示回复）`;
  const task = extractTaskLocally(input);
  const title = task.title || '今天最重要的一件事'; const duration = task.estimatedMinutes ?? 25;
  const tail = '\n\n点击消息下方的「转为待办」，确认日期和时间后保存；再去「生活」开始专注。\n\n这是 Mock 演示回复，未调用外部 AI。';
  if (persona.responseLength === 'short') return `${intro}\n\n先开始「${title}」，专注 ${duration} 分钟就好。${tail}`;
  return `${intro}\n\n可以先把「${title}」拆成一个容易开始的小目标：\n\n1. 用 2 分钟准备资料，清理桌面。\n2. 专注 ${duration} 分钟，只推进这一个目标。\n3. 结束后记录进展，再休息 5 分钟。${tail}`;
}
export class MockAIProvider implements AIProvider {
  readonly mode = 'mock' as const;
  constructor(private readonly chunkDelay = 18) {}
  async *streamChat(request: ChatRequest): AsyncGenerator<AIStreamEvent> {
    throwIfAborted(request.signal);
    const characters = Array.from(mockReply(request));
    for (let offset = 0; offset < characters.length; offset += 5) {
      await delay(this.chunkDelay, request.signal);
      yield { type: 'delta', text: characters.slice(offset, offset + 5).join('') };
    }
    yield { type: 'done' };
  }
  async extractTask(request: ExtractRequest) {
    throwIfAborted(request.signal); return extractTaskLocally(request.text, request.now);
  }
}

