import type { Task, TaskCategory, TaskDraft } from './types';
import { TASK_CATEGORIES } from './types';
import { isRecord, localDate, makeId, validDate } from './utils';
export function validateTaskDraft(input: unknown): TaskDraft {
  if (!isRecord(input)) throw new Error('任务格式无效');
  if (typeof input.title !== 'string' || !input.title.trim()) throw new Error('请输入任务标题');
  if (input.title.trim().length > 120) throw new Error('任务标题不能超过 120 字');
  const description = input.description ?? '';
  if (typeof description !== 'string' || description.length > 4000) throw new Error('任务描述不能超过 4000 字');
  const category = input.category ?? '其他';
  if (!(TASK_CATEGORIES as readonly unknown[]).includes(category)) throw new Error('任务分类无效');
  const dueDate = input.dueDate === '' ? null : input.dueDate ?? null;
  const dueTime = input.dueTime === '' ? null : input.dueTime ?? null;
  if (dueDate !== null && (typeof dueDate !== 'string' || !validDate(dueDate))) throw new Error('日期格式应为 YYYY-MM-DD');
  if (dueTime !== null && (typeof dueTime !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(dueTime))) throw new Error('时间格式应为 HH:mm');
  const estimatedMinutes = input.estimatedMinutes ?? null;
  if (estimatedMinutes !== null && (typeof estimatedMinutes !== 'number' || !Number.isFinite(estimatedMinutes) || !Number.isInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1440)) throw new Error('预计时长应为 1–1440 分钟');
  for (const key of ['personaId', 'sourceMessageId'] as const) {
    if (input[key] !== undefined && input[key] !== null && typeof input[key] !== 'string') throw new Error(`${key} 无效`);
  }
  return { title: input.title.trim(), description: description.trim(), category: category as TaskCategory,
    dueDate: dueDate as string | null, dueTime: dueTime as string | null, estimatedMinutes: estimatedMinutes as number | null,
    personaId: typeof input.personaId === 'string' ? input.personaId : null,
    sourceMessageId: typeof input.sourceMessageId === 'string' ? input.sourceMessageId : null };
}
export function taskDueAt(draft: TaskDraft): string | null {
  if (!draft.dueDate || !draft.dueTime) return null;
  const date = new Date(`${draft.dueDate}T${draft.dueTime}:00`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
export function createTask(input: unknown, now = new Date()): Task {
  const draft = validateTaskDraft(input);
  return { ...draft, id: makeId('task'), dueAt: taskDueAt(draft), completed: false, completedAt: null,
    createdAt: now.toISOString(), updatedAt: now.toISOString(), notificationId: null };
}
export function updateTask(task: Task, input: unknown, now = new Date()): Task {
  const draft = validateTaskDraft(input);
  return { ...task, ...draft, dueAt: taskDueAt(draft), updatedAt: now.toISOString() };
}
export function setTaskCompleted(task: Task, completed: boolean, now = new Date()): Task {
  return { ...task, completed, completedAt: completed ? (task.completedAt ?? now.toISOString()) : null, updatedAt: now.toISOString() };
}
export function deleteTask(tasks: Task[], id: string): Task[] { return tasks.filter((task) => task.id !== id); }
export function filterTasks(tasks: Task[], filter: 'all' | 'today' | 'upcoming' | 'completed', query = '', now = new Date()): Task[] {
  const today = localDate(now);
  return tasks.filter((task) => {
    if (query.trim() && !`${task.title} ${task.description}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (filter === 'completed') return task.completed;
    if (filter === 'today') return !task.completed && task.dueDate === today;
    if (filter === 'upcoming') return !task.completed && task.dueDate !== null && task.dueDate > today;
    return !task.completed;
  }).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99') || b.createdAt.localeCompare(a.createdAt));
}
function numberFromText(text: string): number | null {
  if (/^\d+$/.test(text)) return Number(text);
  const digits: Record<string, number> = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (text === '十') return 10;
  if (text.includes('十')) {
    const [tens, units] = text.split('十');
    const first = tens ? digits[tens] : 1;
    const last = units ? digits[units] : 0;
    return first === undefined || last === undefined ? null : first * 10 + last;
  }
  return digits[text] ?? null;
}
export function extractTaskLocally(text: string, now = new Date()): TaskDraft {
  const input = text.trim();
  if (!input) throw new Error('请先输入要转为待办的内容');
  let title = input;
  let dueDate: string | null = null;
  let dueTime: string | null = null;
  let estimatedMinutes: number | null = null;
  const explicitDate = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicitDate && validDate(explicitDate[1]!)) { dueDate = explicitDate[1]!; title = title.replace(explicitDate[0], ''); }
  if (!dueDate) {
    const relative = input.match(/大后天|后天|明天|今天/);
    if (relative) {
      const offset: Record<string, number> = { 今天: 0, 明天: 1, 后天: 2, 大后天: 3 };
      const date = new Date(now); date.setDate(date.getDate() + offset[relative[0]]!);
      dueDate = localDate(date); title = title.replace(relative[0], '');
    }
  }
  // Bare 三点 is ambiguous between 03:00 and 15:00, so only clear day periods are accepted.
  const chineseTime = input.match(/(早上|上午|中午|下午|晚上|凌晨)\s*([零一二两三四五六七八九十\d]{1,3})[点时](半|一刻|三刻|([零一二两三四五六七八九十\d]{1,3})分?)?/);
  if (chineseTime) {
    let hour = numberFromText(chineseTime[2]!);
    const minute = chineseTime[3] === '半' ? 30 : chineseTime[3] === '一刻' ? 15 : chineseTime[3] === '三刻' ? 45 : chineseTime[4] ? numberFromText(chineseTime[4]) : 0;
    if (hour !== null && minute !== null && hour <= 12 && minute < 60) {
      const period = chineseTime[1]!;
      const ambiguous = (period === '晚上' && hour === 12) || (period === '上午' && hour === 12) || (period === '中午' && ![1, 2, 11, 12].includes(hour));
      if (['下午', '晚上'].includes(period) && hour >= 1 && hour < 12) hour += 12;
      if (period === '中午' && hour >= 1 && hour <= 2) hour += 12;
      if (period === '凌晨' && hour === 12) hour = 0;
      if (!ambiguous) { dueTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`; title = title.replace(chineseTime[0], ''); }
    }
  } else {
    const clock = input.match(/(?:^|[^\d])(\d{1,2}):([0-5]\d)(?!\d)/);
    if (clock && Number(clock[1]) <= 23) { dueTime = `${clock[1]!.padStart(2, '0')}:${clock[2]}`; title = title.replace(`${clock[1]}:${clock[2]}`, ''); }
  }
  const hours = input.match(/([一二两三四五六七八九十\d]+)\s*(?:个)?小时/);
  const minutes = input.match(/([一二两三四五六七八九十\d]+)\s*分钟/);
  if (hours || minutes || input.includes('半小时')) {
    const hourValue = hours ? numberFromText(hours[1]!) : 0;
    const minuteValue = minutes ? numberFromText(minutes[1]!) : 0;
    const amount = (hourValue ?? 0) * 60 + (minuteValue ?? 0) + (input.includes('半小时') ? 30 : 0);
    if (amount > 0 && amount <= 1440) {
      estimatedMinutes = amount;
      if (hours) title = title.replace(hours[0], '');
      if (minutes) title = title.replace(minutes[0], '');
      title = title.replace('半小时', '');
    }
  }
  let category: TaskCategory = '其他';
  if (/阅读|读书|看书|读.{0,8}书/.test(input)) category = '阅读';
  else if (/跑步|健身|锻炼|运动|游泳|瑜伽|骑行/.test(input)) category = '运动';
  else if (/休息|午睡|放松|冥想/.test(input)) category = '休息';
  else if (/上课|课程|听课|实验课/.test(input)) category = '课程';
  else if (/复习|学习|作业|高数|英语|单词|考试|论文|编程/.test(input)) category = '学习';
  title = title.replace(/^[\s，,。.!！:：]+|[\s，,。.!！:：]+$/g, '').replace(/\s+/g, ' ').trim();
  return validateTaskDraft({ title: (title || input).slice(0, 120), description: '', category, dueDate, dueTime, estimatedMinutes, personaId: null, sourceMessageId: null });
}
