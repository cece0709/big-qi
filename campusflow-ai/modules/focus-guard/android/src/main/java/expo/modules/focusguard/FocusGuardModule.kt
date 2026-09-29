package expo.modules.focusguard

import android.app.AppOpsManager
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

class FocusGuardModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FocusGuard")

    AsyncFunction("getStatus") { status() }
    AsyncFunction("getLauncherApps") { launcherApps() }
    AsyncFunction("getUsageSummary") { packageNames: List<String>, sinceMillis: Double ->
      usageSummary(packageNames, sinceMillis.toLong())
    }
    AsyncFunction("openUsageAccessSettings") { openSettings(Settings.ACTION_USAGE_ACCESS_SETTINGS) }
      .runOnQueue(Queues.MAIN)
    AsyncFunction("openAccessibilitySettings") { openSettings(Settings.ACTION_ACCESSIBILITY_SETTINGS) }
      .runOnQueue(Queues.MAIN)
    AsyncFunction("recordConsent") { version: Int ->
      FocusGuardStore.recordConsent(context, version)
      status()
    }
    AsyncFunction("resetConsent") {
      FocusGuardStore.clearConsent(context)
      status()
    }
    AsyncFunction("setFocusSession") { packageNames: List<String>, expiresAt: Double ->
      FocusGuardStore.configureSession(context, packageNames, expiresAt.toLong())
      status()
    }
    AsyncFunction("clearFocusSession") {
      FocusGuardStore.clearSession(context)
      status()
    }
    AsyncFunction("pauseGuardForFiveMinutes") {
      FocusGuardStore.pauseForFiveMinutes(context)
      status()
    }
  }

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React application context is unavailable" }

  private fun status(): Map<String, Any> = mapOf(
    "usageAccessGranted" to hasUsageAccess(),
    "accessibilityEnabled" to FocusGuardAccessibilityService.isEnabled(context),
    "consentRecorded" to FocusGuardStore.hasRecordedConsent(context),
    "focusActive" to FocusGuardStore.isSessionActive(context),
    "temporaryPauseUntil" to FocusGuardStore.temporaryPauseUntil(context)
  )

  private fun openSettings(action: String): Boolean {
    val intent = Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    if (intent.resolveActivity(context.packageManager) == null) return false
    return runCatching {
      context.startActivity(intent)
      true
    }.getOrDefault(false)
  }

  @Suppress("DEPRECATION")
  private fun launcherApps(): List<Map<String, String>> {
    val packageManager = context.packageManager
    val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    return packageManager.queryIntentActivities(launcherIntent, 0)
      .asSequence()
      .mapNotNull { resolveInfo ->
        val activityInfo = resolveInfo.activityInfo ?: return@mapNotNull null
        val packageName = activityInfo.packageName ?: return@mapNotNull null
        if (!FocusGuardStore.isSelectablePackage(context, packageName)) return@mapNotNull null
        val label = runCatching {
          packageManager.getApplicationLabel(activityInfo.applicationInfo).toString()
        }.getOrDefault(packageName).ifBlank { packageName }
        mapOf("packageName" to packageName, "label" to label)
      }
      .distinctBy { it["packageName"] }
      .sortedWith(compareBy({ it["label"]?.lowercase(Locale.getDefault()) }, { it["packageName"] }))
      .toList()
  }

  private fun usageSummary(requestedPackages: List<String>, sinceMillis: Long): List<Map<String, Any>> {
    if (!hasUsageAccess() || !FocusGuardStore.hasRecordedConsent(context)) return emptyList()
    val selectedPackages = requestedPackages.asSequence()
      .map(String::trim)
      .filter { FocusGuardStore.isSelectablePackage(context, it) }
      .distinct()
      .toList()
    if (selectedPackages.isEmpty()) return emptyList()

    val now = System.currentTimeMillis()
    val begin = sinceMillis.coerceAtLeast(0L).coerceAtMost(now)
    val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
      ?: return emptyList()
    val selectedSet = selectedPackages.toSet()
    val totals = mutableMapOf<String, Long>()
    val statistics: List<UsageStats> = runCatching {
      usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, begin, now)
    }.getOrElse { emptyList() }
    for (usage in statistics) {
      val packageName = usage.packageName ?: continue
      if (packageName in selectedSet) {
        totals[packageName] = (totals[packageName] ?: 0L) + usage.totalTimeInForeground.coerceAtLeast(0L)
      }
    }
    return selectedPackages.map { packageName ->
      mapOf(
        "packageName" to packageName,
        "label" to labelFor(packageName),
        "foregroundMs" to (totals[packageName] ?: 0L)
      )
    }.sortedByDescending { it["foregroundMs"] as Long }
  }

  private fun labelFor(packageName: String): String = runCatching {
    context.packageManager.getApplicationLabel(
      context.packageManager.getApplicationInfo(packageName, 0)
    ).toString()
  }.getOrDefault(packageName).ifBlank { packageName }

  private fun hasUsageAccess(): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
    return appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      context.packageName
    ) == AppOpsManager.MODE_ALLOWED
  }
}

