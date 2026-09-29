package expo.modules.focusguard

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent

/**
 * This service intentionally observes only the foreground package name. It never reads
 * event text, view trees, input, notifications, screenshots, or any other app content.
 */
class FocusGuardAccessibilityService : AccessibilityService() {
  private var lastRedirectAt = 0L
  private var lastRedirectedPackage: String? = null

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val foregroundPackage = event.packageName?.toString()?.trim().orEmpty()
    if (foregroundPackage.isBlank() || foregroundPackage == packageName) return
    val now = System.currentTimeMillis()
    if (foregroundPackage == lastRedirectedPackage && now - lastRedirectAt < 700L) return
    if (!FocusGuardStore.shouldReturnHome(applicationContext, foregroundPackage, now)) return

    lastRedirectedPackage = foregroundPackage
    lastRedirectAt = now
    performGlobalAction(GLOBAL_ACTION_HOME)
  }

  override fun onInterrupt() = Unit

  companion object {
    fun isEnabled(context: Context): Boolean {
      val expected = ComponentName(context, FocusGuardAccessibilityService::class.java)
      val enabledServices = Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
      ).orEmpty()
      return enabledServices.split(':').any { value ->
        ComponentName.unflattenFromString(value)?.let { it == expected } == true
      }
    }
  }
}
