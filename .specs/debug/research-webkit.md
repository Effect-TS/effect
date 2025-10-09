# WebKit Inspector Research

## Summary
- WebKit-based runtimes (Safari, WKWebView, Bun) expose the Web Inspector protocol, a JSON-RPC dialect that mirrors Chrome DevTools structure but with WebKit-specific domain names.
- Targets are discovered through WebSocket endpoints exposed by host tooling: macOS/iOS use `ios_webkit_debug_proxy` or `RemoteInspector`, while Bun prints a `ws://` URL that tunnels to WebKit’s inspector runtime.
- Each request envelope includes an incrementing `id`, a `method` such as `Runtime.evaluate`, and `params` matching the Web Inspector Protocol reference (`inspector/Protocol/*.json` in WebKit sources).

## Transport & Tooling
- **ios_webkit_debug_proxy** bridges USB-connected Safari / WKWebView instances to local HTTP + WebSocket endpoints. It exposes pages at `http://127.0.0.1:9223/json` and tunnels WebSocket traffic to the device (`google/ios-webkit-debug-proxy:README.md`).
- **RemoteInspector** (macOS Safari) can be enabled by running `defaults write com.apple.Safari IncludeInternalDebugMenu -bool true` and using the Develop menu to allow remote automation; the same discovery API is available via `ios_webkit_debug_proxy -c null:9223`. (`webkit.org/web-inspector/enabling-web-inspector`).
- **Bun --inspect** starts WebKit’s inspector backend and prints a `debug.bun.sh` URL that wraps the raw WebSocket endpoint (`bun/docs/runtime/debugger`).

## Message Flow
1. Client connects to the WebSocket endpoint (e.g., `ws://127.0.0.1:9223/devtools/page/1`).
2. Client sends `{ "id": 1, "method": "Runtime.enable" }` to start receiving console updates.
3. Client can evaluate code with `{ "id": 2, "method": "Runtime.evaluate", "params": { "expression": "2+2", "includeCommandLineAPI": true } }` and receives `result.result.value` with the computed value.
4. Additional domains (Debugger, Network, Page) follow the same JSON envelope defined in WebKit’s protocol definitions (`Source/WebInspectorUI/UserInterface/Protocol`).

## Troubleshooting
- If the WebSocket closes immediately, ensure the Develop menu is enabled and the target allows remote inspectors. iOS devices must trust the host Mac and have “Web Inspector” toggled on (Settings ▸ Safari ▸ Advanced).
- `ios_webkit_debug_proxy` requires `libimobiledevice`; install via `brew install ios-webkit-debug-proxy libimobiledevice`.
- Bun’s inspector only stays open while the process is running; supply `--inspect-wait` to pause execution until the debugger attaches.

## References
- `https://github.com/google/ios-webkit-debug-proxy`
- `https://webkit.org/web-inspector/enabling-web-inspector`
- `https://bun.com/docs/runtime/debugger`
- Web Inspector Protocol sources (`https://trac.webkit.org/browser/webkit/trunk/Source/WebInspectorUI/UserInterface/Protocol`)
