// Detect whether the web app is running inside the Mote POS Android APK
// (Capacitor WebView) rather than a normal browser.
//
// The APK loads this site via Capacitor `server.url` (remote URL). With a remote
// URL the most reliable signal is the USER-AGENT: the APK appends
// "MotePOSApp/1.0". `window.Capacitor` is also injected, but UA is checked first
// because it is guaranteed regardless of injection timing.

let debugLogged = false

export function isInMoteApp(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent || ''
  const byUserAgent = ua.includes('MotePOSApp')

  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  const byCapacitor = typeof cap !== 'undefined' && (cap.isNativePlatform?.() ?? true)

  const result = byUserAgent || byCapacitor

  // Temporary debug aid (logs once per session) to diagnose APK detection.
  if (!debugLogged && typeof console !== 'undefined') {
    debugLogged = true
    console.log(
      '[MotePOS] APK detection — userAgent:',
      ua,
      '| byUserAgent:',
      byUserAgent,
      '| byCapacitor:',
      byCapacitor,
      '| isInMoteApp:',
      result,
    )
  }

  return result
}
