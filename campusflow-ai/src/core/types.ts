export const TASK_CATEGORIES = ['学习', '阅读', '运动', '休息', '课程', '其他'] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type ResponseLength = 'short' | 'medium' | 'long';
export type PersonaNotificationTone = 'warm' | 'direct' | 'light';
export type FocusGuardMode = 'insights' | 'nudge';
export interface FocusGuardApp {
  packageName: string;
  label: string;
  selectedAt: string;
}
export interface FocusGuardConsent {
  disclosureVersion: 1;
  scopeKey: string;
  firstConfirmedAt: string;
  secondConfirmedAt: string | null;
}
export type PersonaCompletionField = 'name' | 'identity' | 'background' | 'personalityTags' | 'speakingStyle' | 'userNickname' | 'greeting' | 'dos' | 'donts' | 'pinnedMemories';
export interface PersonaCompletionState {
  /** Fields still awaiting an explicit document detail or user-approved chat completion. */
  pending: PersonaCompletionField[];
  /** The owner can opt in before chat text is applied to a persona automatically. */
  autoFromChat: boolean;
}
export interface Persona {
  id: string; name: string; avatarUri: string | null; identity: string; background: string;
  personalityTags: string[]; speakingStyle: string; responseLength: ResponseLength;
  userNickname: string; greeting: string; dos: string[]; donts: string[]; pinnedMemories: string[];
  createdAt: string; updatedAt: string; isExample?: boolean;
  completion?: PersonaCompletionState;
}
export type PersonaInput = Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>;
export interface Conversation { id: string; personaId: string; createdAt: string; updatedAt: string }
export type MessageStatus = 'sending' | 'streaming' | 'sent' | 'error';
export interface Message {
  id: string; conversationId: string; role: 'user' | 'assistant' | 'system'; content: string;
  createdAt: string; status: MessageStatus; error?: string;
}
export interface TaskDraft {
  title: string; description: string; category: TaskCategory; dueDate: string | null;
  dueTime: string | null; estimatedMinutes: number | null; sourceMessageId: string | null;
  personaId: string | null;
}
export interface Task extends TaskDraft {
  id: string; dueAt: string | null; completed: boolean; completedAt: string | null;
  createdAt: string; updatedAt: string; notificationId?: string | null; isExample?: boolean;
}
export type TimerMode = 'focus' | 'break' | 'stopwatch';
export interface TimerState {
  id: string; mode: TimerMode; status: 'running' | 'paused'; plannedSeconds: number | null;
  accumulatedSeconds: number; lastStartedAt: number | null; startedAt: string;
  taskId: string | null; category: TaskCategory;
}
export interface FocusSession {
  id: string; taskId: string | null; category: TaskCategory; plannedMinutes: number | null;
  actualSeconds: number; status: 'completed' | 'interrupted'; startedAt: string; endedAt: string;
  mode: TimerMode; isExample?: boolean;
}
export interface Settings {
  aiMode: 'mock' | 'api'; selectedPersonaId: string | null; notificationsEnabled: boolean;
  personaNotificationsEnabled: boolean; personaNotificationPersonaId: string | null;
  /** Kept for older exports and app versions; it mirrors the first selected time. */
  personaNotificationTime: string; personaNotificationId: string | null;
  /** Daily local-message times chosen by the owner. */
  personaNotificationTimes: string[]; personaNotificationIds: string[];
  personaNotificationTone: PersonaNotificationTone;
  personaQuietHoursEnabled: boolean; personaQuietHoursStart: string; personaQuietHoursEnd: string;
  /** Android-only and off by default. A changed scope clears the owner’s confirmation. */
  focusGuardMode: FocusGuardMode; focusGuardEnabled: boolean;
  focusGuardSelectedApps: FocusGuardApp[]; focusGuardConsent: FocusGuardConsent | null;
  theme: 'mint' | 'lavender' | 'peach'; backgroundType: 'gradient' | 'solid' | 'image';
  backgroundUri: string | null;
}
export interface AppData {
  schemaVersion: 1; personas: Persona[]; conversations: Conversation[]; messages: Message[];
  tasks: Task[]; focusSessions: FocusSession[]; settings: Settings; timer: TimerState | null;
}
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export type StatisticsPeriod = 'day' | 'week' | 'month';
export interface DailyStatistic { date: string; focusMinutes: number; completedTasks: number }
export interface Statistics {
  todayFocusMinutes: number; todayCompletedTasks: number; streak: number;
  focusMinutes: number; completedTasks: number; trend: DailyStatistic[];
  heatmap: DailyStatistic[]; categoryMinutes: Record<TaskCategory, number>;
  recent7Minutes: number; previous7Minutes: number; changePercent: number | null;
}

