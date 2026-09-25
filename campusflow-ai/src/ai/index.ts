import { MockAIProvider } from './mock';
import { ProxyAIProvider } from './proxy';
import type { AIProvider } from './types';
export * from './types';
export { MockAIProvider } from './mock';
export { ProxyAIProvider } from './proxy';
export function createAIProvider(options: { mode: 'mock' | 'api'; baseUrl?: string }): AIProvider {
  if (options.mode === 'mock') return new MockAIProvider();
  return new ProxyAIProvider(options.baseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8787');
}

