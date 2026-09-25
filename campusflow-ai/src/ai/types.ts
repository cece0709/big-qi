import type { Message, Persona, TaskDraft } from '../core/types';
export type AIMessage = Pick<Message, 'role' | 'content'>;
export type AIStreamEvent = { type: 'delta'; text: string } | { type: 'done' } | { type: 'error'; message: string };
export interface ChatRequest { persona: Persona; messages: AIMessage[]; signal?: AbortSignal }
export interface ExtractRequest { text: string; now?: Date; signal?: AbortSignal }
export interface AIProvider {
  readonly mode: 'mock' | 'api';
  streamChat(request: ChatRequest): AsyncGenerator<AIStreamEvent>;
  extractTask(request: ExtractRequest): Promise<TaskDraft>;
}
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export function abortError(): Error {
  const error = new Error('请求已取消'); error.name = 'AbortError'; return error;
}
export function throwIfAborted(signal?: AbortSignal): void { if (signal?.aborted) throw abortError(); }

