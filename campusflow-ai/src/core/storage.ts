import type { AppData, Conversation, FocusGuardApp, FocusGuardConsent, FocusGuardMode, FocusSession, Message, Persona, Settings, StorageAdapter, Task, TimerState } from './types';
import { TASK_CATEGORIES } from './types';
import { focusGuardScopeKey, isFocusGuardPackageName } from './focusGuard';
import { createExamplePersonas, validatePersona } from './personas';
import { validateTaskDraft, taskDueAt } from './tasks';
import { isRecord, localDate, validImageUri, validIso } from './utils';
export const STORAGE_KEY = 'campusflow:data:v1';
export function createInitialData(now = new Date()): AppData {
  const personas = createExamplePersonas(now);
  return { schemaVersion: 1, personas, conversations: [], messages: [], tasks: [], focusSessions: [],
    settings: { aiMode: 'mock', selectedPersonaId: personas[0]?.id ?? null, notificationsEnabled: false,
      personaNotificationsEnabled: false, personaNotificationPersonaId: personas[0]?.id ?? null,
      personaNotificationTime: '20:00', personaNotificationId: null,
      personaNotificationTimes: ['20:00'], personaNotificationIds: [], personaNotificationTone: 'warm',
      personaQuietHoursEnabled: false, personaQuietHoursStart: '22:30', personaQuietHoursEnd: '07:30',
      focusGuardMode: 'insights', focusGuardEnabled: false, focusGuardSelectedApps: [], focusGuardConsent: null,
      theme: 'mint', backgroundType: 'gradient', backgroundUri: null }, timer: null };
}
function requireArray(input: Record<string, unknown>, key: string): unknown[] {
  const value = input[key];
  if (!Array.isArray(value)) throw new Error(`本地数据损坏：${key} 不是列表`);
  return value as unknown[];
}
function recordWithId(value: unknown): Record<string, unknown> & { id: string } {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id) throw new Error('本地记录缺少标识');
  return value as Record<string, unknown> & { id: string };
}
function requireIso(value: unknown): string { if (!validIso(value)) throw new Error('本地记录的日期无效'); return value; }
function nullableString(value: unknown): string | null { if (value === null || value === undefined) return null; if (typeof value !== 'string') throw new Error('本地记录的关联无效'); return value; }
function validNotificationTime(value: unknown): value is string { return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function notificationTimes(value: unknown, fallback: string): string[] {
  const source = value === undefined ? [fallback] : value;
  if (!Array.isArray(source) || !source.length || source.some((item) => !validNotificationTime(item))) throw new Error('角色消息提醒时间无效');
  return [...new Set(source)].sort();
}
function notificationIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new Error('角色消息提醒标识无效');
  return [...new Set(value)];
}
function focusGuardApps(value: unknown): FocusGuardApp[] {
  if (!Array.isArray(value)) throw new Error('专注守护应用列表无效');
  const seen = new Set<string>();
  return value.map((value) => {
    if (!isRecord(value) || !isFocusGuardPackageName(value.packageName) || typeof value.label !== 'string' || !value.label.trim() || value.label.length > 160 || !validIso(value.selectedAt)) throw new Error('专注守护应用无效');
    if (seen.has(value.packageName)) throw new Error('专注守护应用重复');
    seen.add(value.packageName);
    return { packageName:value.packageName, label:value.label.trim(), selectedAt:value.selectedAt };
  });
}
function focusGuardConsent(value: unknown, mode: FocusGuardMode, apps: readonly FocusGuardApp[]): FocusGuardConsent | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || value.disclosureVersion !== 1 || typeof value.scopeKey !== 'string' || !validIso(value.firstConfirmedAt) || (value.secondConfirmedAt !== null && !validIso(value.secondConfirmedAt))) throw new Error('专注守护确认记录无效');
  if (value.scopeKey !== focusGuardScopeKey(mode, apps)) return null;
  return {
    disclosureVersion:1,
    scopeKey:value.scopeKey,
    firstConfirmedAt:value.firstConfirmedAt,
    secondConfirmedAt:value.secondConfirmedAt as string | null
  };
}
function checkUnique(items: { id: string }[], name: string): void { if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`本地${name}存在重复记录`); }
export function migrateData(input: unknown): AppData {
  if (!isRecord(input)) throw new Error('本地数据格式无效，原始数据已保留');
  const version = input.schemaVersion ?? 0;
  if (version !== 0 && version !== 1) throw new Error('此数据由更新版本创建，请升级应用后再打开');
  const legacy = version === 0;
  const source: Record<string, unknown> = legacy ? { ...createInitialData(), ...input } : input;
  const personas: Persona[] = requireArray(source, 'personas').map((value) => {
    const item = recordWithId(value);
    return { ...validatePersona(item), id: item.id, createdAt: requireIso(item.createdAt), updatedAt: requireIso(item.updatedAt) };
  });
  const conversations: Conversation[] = requireArray(source, 'conversations').map((value) => {
    const item = recordWithId(value);
    if (typeof item.personaId !== 'string') throw new Error('对话缺少角色');
    return { id: item.id, personaId: item.personaId, createdAt: requireIso(item.createdAt), updatedAt: requireIso(item.updatedAt) };
  });
  const messages: Message[] = requireArray(source, 'messages').map((value) => {
    const item = recordWithId(value);
    if (typeof item.conversationId !== 'string' || typeof item.content !== 'string' || !['user', 'assistant', 'system'].includes(item.role as string) || !['sending', 'streaming', 'sent', 'error'].includes(item.status as string)) throw new Error('聊天记录格式无效');
    return { id: item.id, conversationId: item.conversationId, role: item.role as Message['role'], content: item.content,
      createdAt: requireIso(item.createdAt), status: item.status as Message['status'], ...(typeof item.error === 'string' ? { error: item.error } : {}) };
  });
  const tasks: Task[] = requireArray(source, 'tasks').map((value) => {
    const item = recordWithId(value);
    const priorDate = legacy && validIso(item.dueAt) ? new Date(item.dueAt) : null;
    const draft = validateTaskDraft({ ...item,
      dueDate: item.dueDate ?? (priorDate ? localDate(priorDate) : null),
      dueTime: item.dueTime ?? (priorDate ? `${String(priorDate.getHours()).padStart(2, '0')}:${String(priorDate.getMinutes()).padStart(2, '0')}` : null) });
    if (typeof item.completed !== 'boolean' || (item.completed && !validIso(item.completedAt))) throw new Error('任务完成状态无效');
    return { ...draft, id: item.id, dueAt: taskDueAt(draft), completed: item.completed,
      completedAt: item.completed ? requireIso(item.completedAt) : null, createdAt: requireIso(item.createdAt), updatedAt: requireIso(item.updatedAt),
      notificationId: nullableString(item.notificationId), isExample: item.isExample === true };
  });
  const focusSessions: FocusSession[] = requireArray(source, 'focusSessions').map((value) => {
    const item = recordWithId(value);
    const mode = item.mode ?? (legacy ? 'focus' : undefined);
    if (!['focus', 'break', 'stopwatch'].includes(mode as string) || !['completed', 'interrupted'].includes(item.status as string) || !(TASK_CATEGORIES as readonly unknown[]).includes(item.category) || typeof item.actualSeconds !== 'number' || !Number.isFinite(item.actualSeconds) || item.actualSeconds < 0 || (item.plannedMinutes !== null && (typeof item.plannedMinutes !== 'number' || !Number.isFinite(item.plannedMinutes) || item.plannedMinutes <= 0))) throw new Error('专注记录格式无效');
    return { id: item.id, taskId: nullableString(item.taskId), category: item.category as FocusSession['category'], plannedMinutes: item.plannedMinutes as number | null,
      actualSeconds: item.actualSeconds, status: item.status as FocusSession['status'], mode: mode as FocusSession['mode'],
      startedAt: requireIso(item.startedAt), endedAt: requireIso(item.endedAt), isExample: item.isExample === true };
  });
  if (!isRecord(source.settings)) throw new Error('设置格式无效');
  const sourceSettings = source.settings;
  const defaults = createInitialData().settings;
  const rawSettings = { ...defaults, ...sourceSettings };
  if (!['mock', 'api'].includes(rawSettings.aiMode) || !['mint', 'lavender', 'peach'].includes(rawSettings.theme) || !['gradient', 'solid', 'image'].includes(rawSettings.backgroundType) || typeof rawSettings.notificationsEnabled !== 'boolean' || typeof rawSettings.personaNotificationsEnabled !== 'boolean' || typeof rawSettings.personaQuietHoursEnabled !== 'boolean' || typeof rawSettings.focusGuardEnabled !== 'boolean' || !['insights', 'nudge'].includes(rawSettings.focusGuardMode as string) || !validNotificationTime(rawSettings.personaNotificationTime) || !validNotificationTime(rawSettings.personaQuietHoursStart) || !validNotificationTime(rawSettings.personaQuietHoursEnd) || !['warm', 'direct', 'light'].includes(rawSettings.personaNotificationTone as string)) throw new Error('设置项无效');
  const times = notificationTimes(sourceSettings.personaNotificationTimes, rawSettings.personaNotificationTime);
  const storedIds = notificationIds(sourceSettings.personaNotificationIds === undefined ? [] : rawSettings.personaNotificationIds);
  const legacyNotificationId = nullableString(rawSettings.personaNotificationId);
  const ids = [...new Set([...storedIds, ...(legacyNotificationId ? [legacyNotificationId] : [])])];
  const focusGuardMode = rawSettings.focusGuardMode as FocusGuardMode;
  const selectedFocusGuardApps = focusGuardApps(rawSettings.focusGuardSelectedApps);
  const focusGuardConsentRecord = focusGuardConsent(rawSettings.focusGuardConsent, focusGuardMode, selectedFocusGuardApps);
  const focusGuardEnabled = rawSettings.focusGuardEnabled === true && focusGuardMode === 'nudge' && selectedFocusGuardApps.length > 0 && Boolean(focusGuardConsentRecord?.secondConfirmedAt);
  const settings: Settings = {
    aiMode: rawSettings.aiMode as Settings['aiMode'], theme: rawSettings.theme as Settings['theme'],
    backgroundType: rawSettings.backgroundType as Settings['backgroundType'], notificationsEnabled: rawSettings.notificationsEnabled,
    personaNotificationsEnabled: rawSettings.personaNotificationsEnabled,
    personaNotificationPersonaId: nullableString(rawSettings.personaNotificationPersonaId),
    personaNotificationTime: times[0] ?? rawSettings.personaNotificationTime, personaNotificationId: ids[0] ?? null,
    personaNotificationTimes: times, personaNotificationIds: ids,
    personaNotificationTone: rawSettings.personaNotificationTone as Settings['personaNotificationTone'],
    personaQuietHoursEnabled: rawSettings.personaQuietHoursEnabled,
    personaQuietHoursStart: rawSettings.personaQuietHoursStart, personaQuietHoursEnd: rawSettings.personaQuietHoursEnd,
    focusGuardMode,
    focusGuardEnabled,
    focusGuardSelectedApps:selectedFocusGuardApps,
    focusGuardConsent:focusGuardConsentRecord,
    backgroundUri: nullableString(rawSettings.backgroundUri), selectedPersonaId: nullableString(rawSettings.selectedPersonaId),
  };
  if (settings.backgroundUri && !validImageUri(settings.backgroundUri)) throw new Error('背景图片地址无效');
  if (!personas.some((persona) => persona.id === settings.selectedPersonaId)) settings.selectedPersonaId = personas[0]?.id ?? null;
  if (!personas.some((persona) => persona.id === settings.personaNotificationPersonaId)) settings.personaNotificationPersonaId = settings.selectedPersonaId;
  let timer: TimerState | null = null;
  if (source.timer !== null && source.timer !== undefined) {
    const item = recordWithId(source.timer);
    if (!['focus', 'break', 'stopwatch'].includes(item.mode as string) || !['running', 'paused'].includes(item.status as string) || typeof item.accumulatedSeconds !== 'number' || !Number.isFinite(item.accumulatedSeconds) || item.accumulatedSeconds < 0 || !(TASK_CATEGORIES as readonly unknown[]).includes(item.category)) throw new Error('计时数据无效');
    if (item.mode === 'stopwatch' ? item.plannedSeconds !== null : typeof item.plannedSeconds !== 'number' || !Number.isFinite(item.plannedSeconds) || item.plannedSeconds <= 0) throw new Error('计划时长无效');
    if (item.status === 'running' ? typeof item.lastStartedAt !== 'number' || !Number.isFinite(item.lastStartedAt) : item.lastStartedAt !== null) throw new Error('计时恢复时间无效');
    timer = { id: item.id, mode: item.mode as TimerState['mode'], status: item.status as TimerState['status'],
      accumulatedSeconds: item.accumulatedSeconds, plannedSeconds: item.plannedSeconds as number | null,
      lastStartedAt: item.lastStartedAt as number | null, taskId: nullableString(item.taskId),
      category: item.category as TimerState['category'], startedAt: requireIso(item.startedAt) };
  }
  checkUnique(personas, '角色'); checkUnique(conversations, '对话'); checkUnique(messages, '消息'); checkUnique(tasks, '任务'); checkUnique(focusSessions, '专注');
  return { schemaVersion: 1, personas, conversations, messages, tasks, focusSessions, settings, timer };
}
/** A single serialized transaction queue prevents slower writes from overwriting newer state. */
export class DataStore {
  private data: AppData;
  private loaded = false;
  private loadPromise: Promise<AppData> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: StorageAdapter, private readonly key = STORAGE_KEY) { this.data = createInitialData(); }
  getSnapshot(): AppData { return this.data; }
  async load(): Promise<AppData> {
    if (this.loaded) return this.data;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      const raw = await this.storage.getItem(this.key);
      if (raw !== null) {
        let parsed: unknown;
        try { parsed = JSON.parse(raw) as unknown; } catch { throw new Error('本地数据无法解析，原始数据已保留。可先导出原始数据再清除。'); }
        this.data = migrateData(parsed);
      }
      this.loaded = true;
      return this.data;
    })();
    try { return await this.loadPromise; } finally { this.loadPromise = null; }
  }
  update(updater: (current: AppData) => AppData): Promise<AppData> {
    return this.enqueue(async () => {
      await this.load();
      const next = migrateData(updater(JSON.parse(JSON.stringify(this.data)) as AppData));
      await this.storage.setItem(this.key, JSON.stringify(next));
      this.data = next; return next;
    });
  }
  replace(data: AppData): Promise<AppData> {
    return this.enqueue(async () => {
      const next = migrateData(data);
      await this.storage.setItem(this.key, JSON.stringify(next));
      this.data = next; this.loaded = true; return next;
    });
  }
  clear(): Promise<AppData> { return this.replace(createInitialData()); }
  async exportRaw(): Promise<string | null> { return this.storage.getItem(this.key); }
  private enqueue(operation: () => Promise<AppData>): Promise<AppData> {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => undefined);
    return result;
  }
}


