import type { FocusGuardApp, FocusGuardMode } from './types';

const packageNamePattern = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;

export function isFocusGuardPackageName(value: unknown): value is string {
  return typeof value === 'string' && packageNamePattern.test(value);
}

/** A scope key lets the app invalidate consent whenever the selected apps or behavior changes. */
export function focusGuardScopeKey(mode: FocusGuardMode, apps: readonly Pick<FocusGuardApp, 'packageName'>[]): string {
  return `${mode}:${[...new Set(apps.map((app) => app.packageName))].sort().join('|')}`;
}
