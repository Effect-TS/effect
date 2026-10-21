/**
 * Main-process browser handoff and encrypted credential storage for Electron.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Layer that acquires Electron main-process browser-login handoff and releases its protocol listeners
   * with the layer’s scope. Build it before `app.whenReady()` while holding the application
   * single-instance lock.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layerBrowser,
  /**
   * Acquires browser-login handoff in the Electron main process. Call before `app.whenReady()` while
   * holding the application single-instance lock; the caller’s scope owns protocol listeners and pending
   * handoffs. HTTPS callbacks require a packaged macOS application with matching signed associated
   * domains.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeBrowser
} from "./internal/browser.ts"
export {
  /**
   * Creates an encrypted credential-vault layer at a private application path using Electron safe
   * storage. The application must hold its single-instance lock and preserve unreadable stores rather
   * than resetting them.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layerVault
} from "./internal/vault.ts"
