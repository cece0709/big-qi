import { Platform } from 'react-native';
import NativeFocusGuard from '../../modules/focus-guard/src/FocusGuardModule';
import type {
  FocusGuardNativeApp,
  FocusGuardNativeStatus,
  FocusGuardUsageEntry,
} from '../../modules/focus-guard/src/FocusGuard.types';

export type FocusGuardRuntimeStatus = FocusGuardNativeStatus & {
  supported: boolean;
  platform: 'android' | 'unsupported';
};

const unsupportedStatus: FocusGuardRuntimeStatus = {
  supported: false,
  platform: 'unsupported',
  usageAccessGranted: false,
  accessibilityEnabled: false,
  consentRecorded: false,
  focusActive: false,
  temporaryPauseUntil: 0,
};

function nativeModule() {
  return Platform.OS === 'android' ? NativeFocusGuard : null;
}

function requireNativeModule() {
  const module = nativeModule();
  if (!module) throw new Error('此功能需要安装包含专注守护的新 Android APK；网页预览和 Expo Go 无法读取或引导其他应用。');
  return module;
}

export function isFocusGuardSupported(): boolean {
  return nativeModule() !== null;
}

export async function getFocusGuardStatus(): Promise<FocusGuardRuntimeStatus> {
  const module = nativeModule();
  if (!module) return unsupportedStatus;
  return { ...(await module.getStatus()), supported:true, platform:'android' };
}

export async function getFocusGuardLauncherApps(): Promise<FocusGuardNativeApp[]> {
  const module = nativeModule();
  return module ? module.getLauncherApps() : [];
}

export async function getFocusGuardUsageSummary(packageNames: readonly string[], sinceMillis: number): Promise<FocusGuardUsageEntry[]> {
  const module = requireNativeModule();
  return module.getUsageSummary([...packageNames], sinceMillis);
}

export async function openFocusGuardUsageAccessSettings(): Promise<void> {
  if (!await requireNativeModule().openUsageAccessSettings()) throw new Error('这台设备没有可打开的“使用情况访问”设置页。');
}

export async function openFocusGuardAccessibilitySettings(): Promise<void> {
  if (!await requireNativeModule().openAccessibilitySettings()) throw new Error('这台设备没有可打开的“无障碍”设置页。');
}

export async function recordFocusGuardConsent(): Promise<FocusGuardRuntimeStatus> {
  const module = requireNativeModule();
  return { ...(await module.recordConsent(1)), supported:true, platform:'android' };
}

/** Safe to call when the native module is unavailable; it guarantees a stale native session is not retained where possible. */
export async function resetFocusGuardConsent(): Promise<void> {
  const module = nativeModule();
  if (module) await module.resetConsent();
}

export async function syncFocusGuardSession(options: { active:boolean; packageNames:readonly string[]; expiresAt:number }): Promise<void> {
  const module = nativeModule();
  if (!module) return;
  if (!options.active) {
    await module.clearFocusSession();
    return;
  }
  await module.setFocusSession([...options.packageNames], options.expiresAt);
}

export async function pauseFocusGuardForFiveMinutes(): Promise<void> {
  await requireNativeModule().pauseGuardForFiveMinutes();
}

export type { FocusGuardNativeApp, FocusGuardUsageEntry } from '../../modules/focus-guard/src/FocusGuard.types';
