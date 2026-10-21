# @effect/auth-react-native

Client-local iOS passkeys and browser login for `@effect/auth`. Applications own
authentication workflows, HTTP, sessions, and native application configuration.
Core has no React Native dependency. Passkeys require iOS 16+; browser login's
minimum depends on the chosen Expo SDK. Passkeys and browser login do not support Android.

For foreground session maintenance on iOS or Android, import `activity` from
`@effect/auth-react-native/SessionActivity` and pass
`sessionRenewal: { activity }` to `AuthAtom.make`. Keep `auth.session` mounted in
your app shell. The adapter follows AppState and releases its subscription with
the session atom; it needs no passkey or Expo dependencies.

Import the package root for passkeys, or `@effect/auth-react-native/BrowserLogin`
for browser login. Install only the optional native peers for the entrypoint you
use, autolink with CocoaPods, and rebuild the application.

## Passkeys

Import `* as ReactNativePasskey` from this package and construct the adapter with
`ReactNativePasskey.make()`, or provide `ReactNativePasskey.layer`.

Install this package and its `react-native` and `react-native-passkey` peers only
in the native application. `@effect/auth` does not depend on React Native or
this adapter. The adapter consumes core's public passkey schemas and returns the
same flow IDs and redacted completion responses as the browser adapter.

Applications own begin → prompt → complete, HTTP, binding, persistence, sessions,
and associated domains. Registration creates ES256 platform passkeys; authentication
also supports existing security-key credentials. iOS 16+ is supported; Android and
conditional mediation are unsupported. Interruption discards delivery but cannot dismiss the system
prompt, and the shared busy guard stays held until the native promise settles.

Configure associated domains and the relying party in the native application before starting ceremonies.

## Browser login

Open your hosted sign-in page with Expo WebBrowser and keep the native session in
Expo SecureStore. Use `@effect/auth/BrowserLogin` for the shared client, server policy, and recovery flow.

Install `expo-web-browser` and `expo-secure-store` matching your Expo SDK and the
[package's peer requirements](package.json), alongside:

```sh
pnpm add @effect/auth-react-native effect react-native-url-polyfill
```

Plain React Native apps must first [install Expo Modules](https://docs.expo.dev/bare/installing-expo-modules/).
Rebuild the native app after installing the peers.

Load the required [WHATWG URL polyfill](https://github.com/charpeni/react-native-url-polyfill)
in your application entrypoint before any auth imports:

```ts
import "react-native-url-polyfill/auto"
import "./app"
```

Supply core's `BrowserLogin.Browser` and `BrowserLogin.Vault` with separate Layers:

```ts
import * as NativeBrowserLogin from "@effect/auth-react-native/BrowserLogin"
import { Layer } from "effect"

export const NativeLoginLive = Layer.merge(
  NativeBrowserLogin.layerBrowser,
  NativeBrowserLogin.layerVault({ service: "com.example.app.auth.production" })
)
```

Create one vault Layer per authentication lifetime and share it with
`BrowserLogin.makeClient` and your native HTTP client's credentials service.
Choose a dedicated `service` per app, server environment, and client ID; keep it
stable across restarts and allow no other writers. Storage is device-only,
available while unlocked, and does not use biometric gating. Keychain data can
survive app deletion.

Your app also supplies `SecureRandom.SecureRandom` and `Digest.Digest` from
`effect/crypto` with cryptographically secure random bytes and SHA-256. React
Native does not supply browser `SubtleCrypto`.
With [`expo-crypto`](https://docs.expo.dev/versions/latest/sdk/crypto/), use
`getRandomValues` and `digest`; `getRandomBytes` can fall back to `Math.random`
in development.

The hosted page must use HTTPS. For a custom callback, register a reverse-domain
scheme in `CFBundleURLTypes` and the exact return URL, such as
`com.example.app://auth/callback`, with your server.

HTTPS callbacks require iOS 17.4+ and a signed `webcredentials:<callback-host>`
[Associated Domains entitlement](https://developer.apple.com/documentation/xcode/supporting-associated-domains).
The host's `apple-app-site-association` file must list the app's `PREFIX.bundleID`
under `webcredentials.apps`. Register the exact callback URL on the server; app IDs
belong to your association setup. The optional `@effect/auth/BrowserLogin` association helper contributes paths to
your app-owned file. Older iOS versions reject HTTPS callbacks.

Let this adapter own the authentication session: do not open a competing
WebBrowser session or handle its callback through `Linking`. If presentation
stays pending, interrupt login before trying again.
