export type FocusGuardNativeStatus = {
  usageAccessGranted: boolean;
  accessibilityEnabled: boolean;
  consentRecorded: boolean;
  focusActive: boolean;
  temporaryPauseUntil: number;
};

export type FocusGuardNativeApp = {
  packageName: string;
  label: string;
};

export type FocusGuardUsageEntry = FocusGuardNativeApp & {
  foregroundMs: number;
};

export type FocusGuardNativeModule = {
  getStatus(): Promise<FocusGuardNativeStatus>;
  getLauncherApps(): Promise<FocusGuardNativeApp[]>;
  getUsageSummary(packageNames: string[], sinceMillis: number): Promise<FocusGuardUsageEntry[]>;
  openUsageAccessSettings(): Promise<boolean>;
  openAccessibilitySettings(): Promise<boolean>;
  recordConsent(version: number): Promise<FocusGuardNativeStatus>;
  resetConsent(): Promise<FocusGuardNativeStatus>;
  setFocusSession(packageNames: string[], expiresAt: number): Promise<FocusGuardNativeStatus>;
  clearFocusSession(): Promise<FocusGuardNativeStatus>;
  pauseGuardForFiveMinutes(): Promise<FocusGuardNativeStatus>;
};
