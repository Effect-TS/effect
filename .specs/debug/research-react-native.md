# React Native DevTools Research

## Summary
- React Native now ships a dedicated DevTools experience built on a fork of the Chrome DevTools frontend and delivered with each release.
- Metro exposes Chrome DevTools Protocol (CDP) endpoints and WebSocket proxies that route debugger traffic between the frontend and connected Hermes runtimes.
- Hermes integrates with the DevTools stack through the `jsinspector-modern` layer, modeling targets, sessions, and agents around native CDP handlers, so no WebKit protocol is involved.

## Architecture
- The debugger UI is packaged as `@react-native/debugger-frontend`, a compiled bundle of the forked Chrome DevTools interface, and is meant to be served by the React Native dev infrastructure rather than a user-installed browser (`packages/debugger-frontend/README.md:3-22`).
- Source for that frontend lives in `facebook/react-native-devtools-frontend`, which is explicitly documented as a fork of the upstream `ChromeDevTools/devtools-frontend` project, aligning its capabilities with Chromium tooling (`react-native-devtools-frontend/README.md:1-74`).
- To improve portability, React Native can launch the debugger inside an Electron shell (`@react-native/debugger-shell`), embedding Chromium while avoiding hosted-mode requirements (`packages/debugger-shell/README.md:1-7`).

## Debugging Workflow
- Metro registers middleware that serves CDP discovery endpoints (`/json`, `/json/list`, `/json/version`) and a debugger launcher (`/open-debugger`) so the Chrome-derived frontend can enumerate and attach to Hermes targets (`packages/dev-middleware/README.md:32-57`).
- WebSocket endpoints (`/inspector/device`, `/inspector/debug`) form the bidirectional bridge: devices publish themselves, and the middleware proxies CDP frames between the frontend and the interpreter (`packages/dev-middleware/README.md:52-57`).
- The inspector proxy rewrites `Debugger.scriptParsed` payloads, normalizes bundle URLs, preserves source-map fidelity, and orchestrates breakpoint resumption, demonstrating that CDP messages are translated but not replaced (`packages/dev-middleware/src/inspector-proxy/Device.js:663-748`).
- CDP traffic can be logged and throttled via the included `CdpDebugLogging` helper, reinforcing that all message handling is CDP-based (`packages/dev-middleware/src/inspector-proxy/CdpDebugLogging.js:19-68`).

## Protocol Evidence
- The `jsinspector-modern` subsystem defines its core concepts—targets, sessions, agents—directly in CDP terms, delegating runtime-specific work (Hermes handlers, host bridges) through CDP agents (`packages/react-native/ReactCommon/jsinspector-modern/CONCEPTS.md:1-14`).
- Hermes exposes CDP-specific tooling hooks (`.../jsinspector-modern/cdp`), providing serialization helpers (`CdpJson`) and platform build artifacts to speak the protocol natively (`packages/react-native/ReactCommon/jsinspector-modern/cdp/CdpJson.cpp:1-80`).
- Official documentation states that React Native DevTools replaces older Chrome-hosted debugging flows, supports Hermes-only apps, and no longer endorses `chrome://inspect`, indicating React Native ships its own vetted CDP frontend (`https://reactnative.dev/docs/react-native-devtools`).

## Implications
- Teams should treat React Native DevTools as a Chrome DevTools fork with React Native–specific integrations, ensuring compatibility by keeping Hermes enabled and Metro accessible.
- Because the system relies on CDP end-to-end, anything that interacts with the DevTools pipeline (custom tooling, middleware) must speak CDP or reuse the provided proxy abstractions; WebKit or Safari debugging protocols are out of scope.

## References
- `packages/debugger-frontend/README.md:3-22`
- `react-native-devtools-frontend/README.md:1-74`
- `packages/debugger-shell/README.md:1-7`
- `packages/dev-middleware/README.md:32-57`
- `packages/dev-middleware/src/inspector-proxy/Device.js:663-748`
- `packages/dev-middleware/src/inspector-proxy/CdpDebugLogging.js:19-68`
- `packages/react-native/ReactCommon/jsinspector-modern/CONCEPTS.md:1-14`
- `packages/react-native/ReactCommon/jsinspector-modern/cdp/CdpJson.cpp:1-80`
- `https://reactnative.dev/docs/react-native-devtools`
