# @effect/auth-electron

Open hosted sign-in in the system browser and keep the native session in
Electron's main process. The renderer receives public session data, never credentials.

Install alongside Electron and Effect:

```sh
pnpm add @effect/auth-electron @effect/auth effect
```

Import `BrowserLogin` from `@effect/auth-electron`. Keep the browser and vault services in the main process.

- Hold Electron's single-instance lock, then acquire
  `makeBrowser({ hostedUrl, returnUrl })` synchronously before `app.whenReady()`.
  Keep it in the application's `Scope` so callbacks can arrive during startup.
- After readiness, provide `layerVault({ path })` with Effect `FileSystem` and
  `Path`. Use one writer and a private absolute path per app, backend, and client.
- Provide both services to core `BrowserLogin.makeClient`, sharing the vault with
  the native `OperationHttpClient`. Keep credential-bearing operations in main.

The hosted page requires HTTPS, except for loopback HTTP development. Register
the exact return URL with the server. Electron does not support `ephemeral: true`;
it cannot promise a private system-browser session or close the tab on cancellation.

## Callback setup

For custom schemes, macOS requires a packaged app declaring the scheme in
`Info.plist`. Linux requires a packaged app with an installed `.desktop` handler
selected as default. Windows supports packaged apps and development registration
with the executable and application paths.

HTTPS callbacks require a signed, packaged macOS app with an Associated Domains
entitlement and a matching website association. Compose and host your app's association file with its claimed HTTPS callback paths. Browser and user
preferences may still require **Open in app**. Windows and Linux support only
custom schemes through this adapter.

## Storage and recovery

OS encryption is required. Linux needs GNOME Keyring or KWallet; there is no
plaintext fallback. Keep the signing identity stable for macOS Keychain access.
Windows encryption does not isolate the vault from other apps running as the same user.

Pending login state survives restarts; use `resume` while the attempt is valid.
Never delete an unreadable vault or reset an uncertain exchange just to restart login:
a native session may already exist. Use the shared `BrowserLogin` recovery operations before retiring the attempt or
resetting storage.
