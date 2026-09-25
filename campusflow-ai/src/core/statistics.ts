import type { AppData, DailyStatistic, Statistics, StatisticsPeriod, TaskCategory } from './types';
import { TASK_CATEGORIES } from './types';
import { localDate } from './utils';
function dayOffset(date: Date, offset: number): Date {
  const result = new Date(date); result.setHours(0, 0, 0, 0); result.setDate(result.getDate() + offset); return result;
}
function makeRange(start: Date, end: Date, rows: Map<string, DailyStatistic>): DailyStatistic[] {
  const result: DailyStatistic[] = [];
  for (let day = new Date(start); day <= end; day = dayOffset(day, 1)) {
    const key = localDate(day); result.push(rows.get(key) ?? { date: key, focusMinutes: 0, completedTasks: 0 });
  }
  return result;
}
/** Sessions are attributed to their local completion date. Breaks do not count as focus. */
export function getStatistics(data: Pick<AppData, 'focusSessions' | 'tasks' | 'messages'>, period: StatisticsPeriod = 'week', now = new Date()): Statistics {
  const rows = new Map<string, DailyStatistic>();
  const activeDays = new Set<string>();
  const row = (key: string): DailyStatistic => {
    if (!rows.has(key)) rows.set(key, { date: key, focusMinutes: 0, completedTasks: 0 });
    return rows.get(key)!;
  };
  const today = localDate(now);
  let start = dayOffset(now, 0);
  let end = dayOffset(now, 0);
  if (period === 'week') { start = dayOffset(now, -((now.getDay() + 6) % 7)); end = dayOffset(start, 6); }
  if (period === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
  const startKey = localDate(start); const endKey = localDate(end);
  const categoryMinutes = Object.fromEntries(TASK_CATEGORIES.map((category) => [category, 0])) as Record<TaskCategory, number>;
  for (const session of data.focusSessions) {
    if (session.mode === 'break' || session.actualSeconds <= 0) continue;
    const date = new Date(session.endedAt);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const key = localDate(date); const minutes = session.actualSeconds / 60;
    row(key).focusMinutes += minutes; activeDays.add(key);
    if (key >= startKey && key <= endKey) categoryMinutes[session.category] += minutes;
  }
  for (const task of data.tasks) {
    if (!task.completed || !task.completedAt) continue;
    const date = new Date(task.completedAt);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const key = localDate(date); row(key).completedTasks += 1; activeDays.add(key);
  }
  for (const message of data.messages) {
    if (message.role === 'user' && message.status === 'sent' && new Date(message.createdAt) <= now) activeDays.add(localDate(new Date(message.createdAt)));
  }
  let streak = 0;
  let cursor = dayOffset(now, activeDays.has(today) ? 0 : -1);
  while (activeDays.has(localDate(cursor))) { streak += 1; cursor = dayOffset(cursor, -1); }
  const recent7Minutes = makeRange(dayOffset(now, -6), dayOffset(now, 0), rows).reduce((sum, item) => sum + item.focusMinutes, 0);
  const previous7Minutes = makeRange(dayOffset(now, -13), dayOffset(now, -7), rows).reduce((sum, item) => sum + item.focusMinutes, 0);
  const trend = makeRange(start, end, rows);
  return { todayFocusMinutes: row(today).focusMinutes, todayCompletedTasks: row(today).completedTasks, streak,
    focusMinutes: trend.reduce((sum, item) => sum + item.focusMinutes, 0),
    completedTasks: trend.reduce((sum, item) => sum + item.completedTasks, 0), trend,
    heatmap: makeRange(dayOffset(now, -34), dayOffset(now, 0), rows), categoryMinutes,
    recent7Minutes, previous7Minutes, changePercent: previous7Minutes === 0 ? null : ((recent7Minutes - previous7Minutes) / previous7Minutes) * 100 };
}
