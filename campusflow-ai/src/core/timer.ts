import type { FocusSession, TaskCategory, TimerMode, TimerState } from './types';
import { TASK_CATEGORIES } from './types';
import { makeId } from './utils';
export interface TimerOptions { mode?: TimerMode; minutes?: number; taskId?: string | null; category?: TaskCategory }
export interface TimerProgress { elapsedSeconds: number; remainingSeconds: number | null; isComplete: boolean }
export function createTimer(options: TimerOptions = {}, now = new Date()): TimerState {
  const mode = options.mode ?? 'focus';
  const minutes = options.minutes ?? (mode === 'break' ? 5 : 25);
  if (!['focus', 'break', 'stopwatch'].includes(mode)) throw new Error('计时模式无效');
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) throw new Error('专注时长应为 1–1440 分钟');
  const category = options.category ?? (mode === 'break' ? '休息' : '学习');
  if (!(TASK_CATEGORIES as readonly string[]).includes(category)) throw new Error('专注分类无效');
  return { id: makeId('focus'), mode, status: 'running', plannedSeconds: mode === 'stopwatch' ? null : Math.round(minutes * 60),
    accumulatedSeconds: 0, lastStartedAt: now.getTime(), startedAt: now.toISOString(), taskId: options.taskId ?? null, category };
}
export function getTimerProgress(timer: TimerState, now = new Date()): TimerProgress {
  const extra = timer.status === 'running' && timer.lastStartedAt !== null ? Math.max(0, (now.getTime() - timer.lastStartedAt) / 1000) : 0;
  const rawSeconds = Math.max(0, timer.accumulatedSeconds + extra);
  const elapsedSeconds = timer.plannedSeconds === null ? rawSeconds : Math.min(rawSeconds, timer.plannedSeconds);
  return { elapsedSeconds, remainingSeconds: timer.plannedSeconds === null ? null : Math.max(0, timer.plannedSeconds - elapsedSeconds),
    isComplete: timer.plannedSeconds !== null && rawSeconds >= timer.plannedSeconds };
}
export function pauseTimer(timer: TimerState, now = new Date()): TimerState {
  if (timer.status === 'paused') return timer;
  return { ...timer, status: 'paused', accumulatedSeconds: getTimerProgress(timer, now).elapsedSeconds, lastStartedAt: null };
}
export function resumeTimer(timer: TimerState, now = new Date()): TimerState {
  if (timer.status === 'running' || getTimerProgress(timer, now).isComplete) return timer;
  return { ...timer, status: 'running', lastStartedAt: now.getTime() };
}
export function resetTimer(timer: TimerState, now = new Date()): TimerState {
  return { ...timer, id: makeId('focus'), status: 'paused', accumulatedSeconds: 0, lastStartedAt: null, startedAt: now.toISOString() };
}
export function finishTimer(timer: TimerState, now = new Date(), forceInterrupted = false): FocusSession {
  const progress = getTimerProgress(timer, now);
  let endedAt = now;
  if (progress.isComplete && timer.status === 'running' && timer.lastStartedAt !== null && timer.plannedSeconds !== null) {
    endedAt = new Date(timer.lastStartedAt + Math.max(0, timer.plannedSeconds - timer.accumulatedSeconds) * 1000);
  }
  return { id: timer.id, taskId: timer.taskId, category: timer.category,
    plannedMinutes: timer.plannedSeconds === null ? null : timer.plannedSeconds / 60,
    actualSeconds: Math.floor(progress.elapsedSeconds), mode: timer.mode,
    status: !forceInterrupted && (progress.isComplete || timer.mode === 'stopwatch') ? 'completed' : 'interrupted',
    startedAt: timer.startedAt, endedAt: endedAt.toISOString() };
}
