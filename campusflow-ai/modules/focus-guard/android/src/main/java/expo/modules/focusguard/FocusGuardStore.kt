package expo.modules.focusguard

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager

/**
 * SharedPreferences is deliberately the only state used by the accessibility service.
 * It keeps the guard bounded by an explicit expiry even when the React process is gone.
 */
internal object FocusGuardStore {
  private const val PREFERENCES = "campusflow_focus_guard"
  private const val KEY_CONSENT_VERSION = "consent_version"
  private const val KEY_PACKAGES = "guarded_packages"
  private const val KEY_EXPIRES_AT = "expires_at"
  private const val KEY_PAUSED_UNTIL = "paused_until"
  private const val CONSENT_VERSION = 1

  private fun preferences(context: Context) = context.applicationContext
    .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  fun recordConsent(context: Context, version: Int) {
    if (version >= CONSENT_VERSION) {
      preferences(context).edit().putInt(KEY_CONSENT_VERSION, CONSENT_VERSION).apply()
    }
  }

  fun clearConsent(context: Context) {
    preferences(context).edit()
      .remove(KEY_CONSENT_VERSION)
      .remove(KEY_PACKAGES)
      .remove(KEY_EXPIRES_AT)
      .remove(KEY_PAUSED_UNTIL)
      .apply()
  }

  fun hasRecordedConsent(context: Context): Boolean =
    preferences(context).getInt(KEY_CONSENT_VERSION, 0) >= CONSENT_VERSION

  fun configureSession(context: Context, requestedPackages: List<String>, expiresAt: Long) {
    val packages = requestedPackages.asSequence()
      .map(String::trim)
      .filter { isSelectablePackage(context, it) }
      .distinct()
      .toSet()
    if (!hasRecordedConsent(context) || packages.isEmpty() || expiresAt <= System.currentTimeMillis()) {
      clearSession(context)
      return
    }
    preferences(context).edit()
      .putStringSet(KEY_PACKAGES, packages)
      .putLong(KEY_EXPIRES_AT, expiresAt)
      .remove(KEY_PAUSED_UNTIL)
      .apply()
  }

  fun clearSession(context: Context) {
    preferences(context).edit()
      .remove(KEY_PACKAGES)
      .remove(KEY_EXPIRES_AT)
      .remove(KEY_PAUSED_UNTIL)
      .apply()
  }

  fun guardedPackages(context: Context): Set<String> =
    preferences(context).getStringSet(KEY_PACKAGES, emptySet())?.toSet().orEmpty()

  fun pauseForFiveMinutes(context: Context) {
    preferences(context).edit()
      .putLong(KEY_PAUSED_UNTIL, System.currentTimeMillis() + 5 * 60 * 1000L)
      .apply()
  }

  fun temporaryPauseUntil(context: Context): Long =
    preferences(context).getLong(KEY_PAUSED_UNTIL, 0L)

  fun isSessionActive(context: Context, now: Long = System.currentTimeMillis()): Boolean {
    val preferences = preferences(context)
    val expiresAt = preferences.getLong(KEY_EXPIRES_AT, 0L)
    if (expiresAt <= now) {
      if (expiresAt > 0L) clearSession(context)
      return false
    }
    if (preferences.getLong(KEY_PAUSED_UNTIL, 0L) > now) return false
    return hasRecordedConsent(context) && guardedPackages(context).isNotEmpty()
  }

  fun shouldReturnHome(context: Context, packageName: String, now: Long = System.currentTimeMillis()): Boolean =
    isSessionActive(context, now) && packageName in guardedPackages(context)

  /** Only ordinary user-launchable apps are allowed into a guard session. */
  fun isSelectablePackage(context: Context, packageName: String): Boolean {
    if (packageName.isBlank() || packageName == context.packageName) return false
    val packageManager = context.packageManager
    val applicationInfo = try {
      packageManager.getApplicationInfo(packageName, 0)
    } catch (_: PackageManager.NameNotFoundException) {
      return false
    }
    if ((applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0) return false
    if (packageName == defaultHomePackage(packageManager)) return false
    val launchIntent = Intent(Intent.ACTION_MAIN)
      .addCategory(Intent.CATEGORY_LAUNCHER)
      .setPackage(packageName)
    @Suppress("DEPRECATION")
    return packageManager.queryIntentActivities(launchIntent, 0).isNotEmpty()
  }

  private fun defaultHomePackage(packageManager: PackageManager): String? {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    @Suppress("DEPRECATION")
    return packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
      ?.activityInfo?.packageName
  }
}
