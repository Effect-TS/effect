**Outcome | Obstacles | Plan**

* **Outcome:** one doc that maps every major JS runtime → its remote-debug APIs, then a capability taxonomy, then paste-and-run quickstarts that prove you can drive them 😎
* **Obstacles:** fragmented protocols (CDP, WebKit Inspector, Firefox RDP, WebDriver BiDi, V8 Inspector), platform quirks, moving targets.
* **Plan:** matrix → taxonomy (from `postMessage` up to breakpoints/profiling) → per-runtime “taste-the-power” blocks → caveats + sources.

---

# 1) Support matrix (2025-09-26 snapshot)

| Runtime / Host                                                                                                 | Primary remote API(s)                                                                 | Transport                           | Notes (what you actually get)                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chromium family** (Chrome, Edge, Brave, Vivaldi, Opera, Android Chrome, Electron renderers, Android WebView) | **CDP** (Chrome DevTools Protocol)                                                    | WS (+ HTTP discovery `/json/*`)     | Full control: `Runtime.evaluate`, `Debugger.*`, `Network.*`, `Page.*`, etc. Edge matches CDP. Android supports remote via USB/ADB; WebView listed in `chrome://inspect`. ([chromedevtools.github.io][1]) |
| **Safari (macOS)** / **iOS Safari** / **WKWebView**                                                            | **WebKit Web Inspector Protocol**                                                     | WS (behind Safari’s Dev/Develop UI) | Enable Develop menu on macOS; enable Web Inspector on iOS; WKWebView can be marked inspectable. ([WebKit][2])                                                                                            |
| **Firefox (desktop & Android)**                                                                                | **Firefox DevTools Remote Debugging Protocol (RDP)**; **WebDriver BiDi** (automation) | TCP (RDP), WS (BiDi via driver)     | RDP powers DevTools; BiDi is production-ready and the cross-browser path; CDP is no longer on by default. ([firefox-source-docs.mozilla.org][3])                                                         |
| **Node.js** (V8)                                                                                               | **V8 Inspector** (CDP dialect) via `--inspect`                                        | WS (+ HTTP discovery on `9229`)     | CDP-style domains exposed; `inspector` module available in-process. ([Node.js][4])                                                                                                                       |
| **Deno**                                                                                                       | **V8 Inspector** (`--inspect`)                                                        | WS (prints `ws://…/ws/<id>`)        | Attach via Chrome DevTools or any CDP client. ([Deno][5])                                                                                                                                                |
| **Bun** (JSC)                                                                                                  | **WebKit Inspector Protocol** (`--inspect`)                                           | WS UI at **debug.bun.sh**           | Bun speaks WebKit's protocol; opens a hosted Inspector front-end. ([Bun][6])                                                                                                                             |
| **Cloudflare Workers** (workerd)                                                                               | **V8 Inspector** (CDP dialect) via `wrangler dev`                                     | WS (+ HTTP discovery `/json`)       | Local dev only; `wrangler dev --inspector-port=9229` exposes full CDP. Production uses tail workers and logs. Full `Runtime.*`, `Debugger.*` support. ([Cloudflare][6a])                                  |
| **React Native (Hermes)**                                                                                      | **CDP-compatible Hermes Inspector**; **React Native DevTools** (frontend)             | WS via Metro/Inspector proxy        | RN 0.76+ ships React Native DevTools; Hermes implements Chrome inspector protocol for in-place debugging. ([React Native][7])                                                                            |
| **React Native (JSC)**                                                                                         | WebKit Inspector (Direct JSC)                                                         | WS via Safari Develop (iOS)         | Use Direct JSC Debugging / Safari Web Inspector on Apple platforms. ([React Native][8])                                                                                                                  |
| **NativeScript**                                                                                               | CDP (Android), WebKit Inspector (iOS)                                                 | As above                            | CLI + VS Code flows map to Chrome/Safari protocols. ([docs.nativescript.org][9])                                                                                                                         |
| **Electron (main process)**                                                                                    | V8 Inspector (`--inspect`, `--inspect-brk`)                                           | WS                                  | Renderer = CDP (Chromium); main = V8 Inspector. ([electronjs.org][10])                                                                                                                                   |
| **Servo**                                                                                                      | Firefox DevTools (RDP)                                                                | TCP                                 | Run Servo with `--devtools=<port>`, connect from Firefox `about:debugging`. ([book.servo.org][11])                                                                                                       |
| **Ladybird**                                                                                                   | **Firefox RDP-compatible devtools server** (`--devtools[=port]`)                       | TCP (length-prefixed JSON)          | Ships documented RDP handshake; enable `--devtools` and connect from Firefox `about:debugging`. (`Documentation/DevTools.md` via `.specs/debug/research-ladybird.md`)                                      |
| **LynxJS / PrimJS**                                                                                            | **CDP** (engine claims full impl.) + custom DevTool bridge                            | WS/USB via Lynx DevTool             | PrimJS advertises full CDP; desktop DevTool app bridges protocols. ([GitHub][13])                                                                                                                        |
| **GraalVM JavaScript**                                                                                         | **CDP** (`--inspect`), also **Debug Adapter Protocol**                                | WS (CDP) / DAP                      | Attach Chrome DevTools or VS Code. ([graalvm.org][14])                                                                                                                                                   |

---

# 2) Capability taxonomy (categorical—know what’s possible)

## A) Message-passing primitives (no “debugger” needed)

* `window.postMessage` (cross-doc), `Worker.postMessage`, `MessageChannel`/`MessagePort`, `BroadcastChannel`, Service Worker `clients.postMessage`. Use these to build app-level RPC and prove comms lines before any debugger work. ([MDN Web Docs][15])

## B) Attach & “RPC with preparation”

* **Discover targets** (HTTP `/json` on CDP; Firefox `about:debugging`; Safari Develop menu; RN DevTools launcher). **Open transport** (WS/TCP). **Send commands** (e.g., `Runtime.enable`, `Target.setAutoAttach`). This is the baseline to call any later feature. ([chromedevtools.github.io][1])

## C) Remote eval (REPL)

* **`Runtime.evaluate`** (CDP/V8 inspector) / **Console expression eval** (WebKit Inspector) / **RDP console actors** (Firefox). Used for probes, feature flags, live patching. (Security: only on trusted hosts; a mis-exposed port is full code-exec.) ([Chrome for Developers][16])

## D) Debugger control

* Set / remove **breakpoints**, **pause/resume**, step in/out/over, **pause on exceptions**, watchpoints (CDP has conditional BPs). Hermes, Node, Browsers all expose this. ([chromedevtools.github.io][1])

## E) DOM/CSS tooling (browser engines)

* **Elements** tree, **styles** mutations, overlay highlighters. CDP/WebKit provide `DOM.*`, `CSS.*`. NativeScript added Elements-like view tree. ([chromedevtools.github.io][1])

## F) Network, storage, and device emulation

* Observe/modify requests, throttling, cache/storage introspection; mobile emulation, geolocation, sensors (CDP), partial in WebKit Inspector. ([Chrome for Developers][17])

## G) Performance & memory

* **CPU profiler**, **heap snapshots**, **sampling heap profiler**, **coverage**; timeline/tracing. Broad in CDP; equivalents in WebKit and Firefox DevTools. ([chromedevtools.github.io][1])

## H) Target management & workers

* Enumerate/attach to subtargets (tabs, iframes, **workers**), auto-attach to new ones (CDP `Target.*`). ([Stack Overflow][18])

## I) Cross-browser automation standard

* **WebDriver BiDi**: streaming, bidirectional, standardizing many CDP-like capabilities; production-ready in Firefox, supported across vendors; ecosystem adding support (Puppeteer, Cypress). Use BiDi where portability matters. ([Chrome for Developers][19])

---

# 3) Paste-and-run “taste-the-power” blocks

> Notes:
> • These use macOS paths where needed.
> • They rely on `jq` and `npx wscat` for WS calls (`brew install jq`; `npx -y wscat` auto-installs).
> • If a block only opens the official inspector UI (not raw WS), it’s because that runtime doesn’t expose a stable public WS that we can reliably script.

### Chromium (Chrome/Chromium/Brave/Vivaldi/Opera) — CDP: open → discover → `Runtime.evaluate`

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 about:blank >/dev/null 2>&1 & sleep 1
WS=$(curl -s http://127.0.0.1:9222/json/new | jq -r .webSocketDebuggerUrl)
npx -y wscat -c "$WS" -x '{"id":1,"method":"Runtime.evaluate","params":{"expression":"2+2"}}'
# Expect a JSON result with {"result": {"value": 4}}.
```

([chromedevtools.github.io][1])

### Microsoft Edge (same CDP)

```bash
"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --remote-debugging-port=9333 about:blank >/dev/null 2>&1 & sleep 1
WS=$(curl -s http://127.0.0.1:9333/json/new | jq -r .webSocketDebuggerUrl)
npx -y wscat -c "$WS" -x '{"id":1,"method":"Runtime.evaluate","params":{"expression":"navigator.userAgent"}}'
```

([Microsoft Learn][20])

### Node.js — V8 Inspector (CDP dialect)

```bash
node --inspect-brk -e "setTimeout(()=>{},1e9)" >/dev/null 2>&1 & sleep 1
WS=$(curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl')
npx -y wscat -c "$WS" -x '{"id":1,"method":"Runtime.evaluate","params":{"expression":"process.version"}}'
```

([Node.js][21])

### Electron (main process) — V8 Inspector

```bash
# Replace "my-electron-app" with your launcher if needed:
my-electron-app --inspect=9230 >/dev/null 2>&1 & sleep 1
WS="ws://127.0.0.1:9230"
npx -y wscat -c "$WS" -x '{"id":1,"method":"Runtime.evaluate","params":{"expression":"process.type"}}'
```

([electronjs.org][10])

### Android Chrome / WebView — ADB + CDP (list targets now)

```bash
adb forward tcp:9222 localabstract:chrome_devtools_remote
open "http://localhost:9222" # DevTools targets page; click Inspect.
```

([Chrome for Developers][22])

### Safari (macOS) / iOS Safari / WKWebView — WebKit Inspector socket

```bash
# Prereqs: brew install ios-webkit-debug-proxy libimobiledevice jq
defaults write com.apple.Safari ShowDevelopMenu -bool true
defaults write com.apple.Safari IncludeInternalDebugMenu -bool true
ios_webkit_debug_proxy -c null:9223 -d >/tmp/ios-wip.log 2>&1 & sleep 2
WS=$(curl -s http://127.0.0.1:9223/json | jq -r '.[0].webSocketDebuggerUrl')
npx -y wscat -c "$WS" -x '{"id":1,"method":"Runtime.evaluate","params":{"expression":"2+2","includeCommandLineAPI":true}}'
```

Expect `"value":4` in the JSON response. iOS devices require Settings ▸ Safari ▸ Advanced ▸ Web Inspector enabled and a trusted USB connection. See `.specs/debug/research-webkit.md` for transport details. ([WebKit][2]) ([ios-webkit-debug-proxy][30])

### Firefox — RDP socket demo (`listTabs`)

```bash
/Applications/Firefox.app/Contents/MacOS/firefox --start-debugger-server 6000 >/tmp/firefox-rdp.log 2>&1 & sleep 1
PORT=6000 python - <<'PY'
import json, os, socket

def read_packet(sock):
    size_bytes = []
    while True:
        ch = sock.recv(1)
        if ch == b':':
            break
        if not ch:
            raise RuntimeError('connection closed while reading size')
        size_bytes.append(ch)
    length = int(b''.join(size_bytes))
    data = sock.recv(length)
    return json.loads(data)

def send_packet(sock, payload):
    data = json.dumps(payload)
    sock.sendall(f"{len(data)}:{data}".encode())

port = int(os.environ.get('PORT', '6000'))
with socket.create_connection(('127.0.0.1', port)) as sock:
    hello = read_packet(sock)
    print('root:', json.dumps(hello, indent=2))
    send_packet(sock, {"to": "root", "type": "listTabs"})
    reply = read_packet(sock)
    print('listTabs:', json.dumps(reply, indent=2))
PY
```

The `listTabs` response proves request/response sequencing described in `.specs/debug/research-firefox.md`. For cross-browser automation, prefer WebDriver **BiDi** when available. ([dataswamp.org][23])

### Deno — V8 Inspector (shows WS endpoint)

```bash
deno eval --inspect-wait "setTimeout(()=>{},1e9)" 2>&1 | sed -n 's/.*\(ws:\/\/[^ ]*\).*/\1/p' | head -n1
# Copy the ws://… URL printed, then:
# npx -y wscat -c "ws://127.0.0.1:9229/ws/<id>" -x '{"id":1,"method":"Runtime.evaluate","params":{"expression":"40+2"}}'
```

([Deno][5])

### Bun — WebKit Inspector (WS bridge via debug.bun.sh)

```bash
WS=$(bun --inspect-wait -e "setTimeout(()=>{},1e9)" 2>&1 | sed -n 's/.*#\(ws:\/\/[^ ]*\)$/\1/p')
npx -y wscat -c "$WS" -x '{"id":1,"method":"Runtime.evaluate","params":{"expression":"globalThis.process?.version ?? 4","includeCommandLineAPI":true}}'
```

Close with `Ctrl+C` after receiving `"type":"number","value":4`. See `.specs/debug/research-webkit.md` for protocol notes. ([Bun][24])

### Cloudflare Workers — V8 Inspector (via wrangler dev)

```bash
# Create and start a basic worker with inspector
npx wrangler init cf-worker --yes
cd cf-worker
cat > src/index.ts << 'EOF'
export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(JSON.stringify({ msg: "Hello Worker!", time: Date.now() }));
  }
}
EOF
npx wrangler dev --inspector-port=9229 >/dev/null 2>&1 & sleep 3
WS=$(curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl')
npx -y wscat -c "$WS" -x '{"id":1,"method":"Runtime.evaluate","params":{"expression":"typeof fetch","returnByValue":true}}'
# Expect: {"result":{"type":"string","value":"function"}}
```

Local dev only; production Workers use `wrangler tail` for logs. Full CDP support including debugger, profiler, and console. See `.specs/debug/research-cloudflare-workers.md` for bindings inspection and production debugging notes. ([Cloudflare][6a])

### React Native (Hermes) — React Native DevTools (RN 0.76+)

```bash
# Terminal 1: start Metro (Hermes app running):
npx react-native start
# Terminal 2: pull Hermes target and evaluate via inspector proxy.
WS=$(curl -s http://127.0.0.1:8081/json/list | jq -r '.[0].webSocketDebuggerUrl')
npx -y wscat -c "$WS" -x '{"id":1,"method":"Runtime.evaluate","params":{"expression":"globalThis.__fbBatchedBridge ? 2+2 : 0","returnByValue":true}}'
```

Look for `"value":4` in the response. Ensure your app opts into Hermes and keep the device/simulator attached so Metro lists the target. See `.specs/debug/research-react-native.md` for protocol notes. ([React Native][25])

### NativeScript — Android (CDP) / iOS (WebKit)

```bash
# Android example (CDP): run your app, then open chrome://inspect to attach.
# iOS example (WebKit): use Safari ▸ Develop to attach to the app’s web runtime.
echo "Run: ns debug android  |  ns debug ios"
```

([docs.nativescript.org][9])

### Servo — Firefox DevTools over RDP

```bash
# In Servo repo (separate terminal):
./mach run --devtools=6080 >/tmp/servo-rdp.log 2>&1 & sleep 1
PORT=6080 python - <<'PY'
import json, os, socket

def read_packet(sock):
    size_bytes = []
    while True:
        ch = sock.recv(1)
        if ch == b':':
            break
        if not ch:
            raise RuntimeError('connection closed while reading size')
        size_bytes.append(ch)
    length = int(b''.join(size_bytes))
    data = sock.recv(length)
    return json.loads(data)

def send_packet(sock, payload):
    data = json.dumps(payload)
    sock.sendall(f"{len(data)}:{data}".encode())

port = int(os.environ.get('PORT', '6080'))
with socket.create_connection(('127.0.0.1', port)) as sock:
    hello = read_packet(sock)
    print('root:', json.dumps(hello, indent=2))
    send_packet(sock, {"to": "root", "type": "listTabs"})
    reply = read_packet(sock)
    print('listTabs:', json.dumps(reply, indent=2))
PY
```

Servo mirrors Firefox’s actor graph; the snippet should return the same `WindowGlobalTargetActor` forms. ([book.servo.org][11])

### Ladybird — Firefox DevTools RDP (`--devtools`)

```bash
DEVTOOLS_DEBUG=1 ladybird --devtools=6081 https://example.com >/tmp/ladybird-rdp.log 2>&1 & sleep 1
PORT=6081 python - <<'PY'
import json, os, socket

def read_packet(sock):
    size_bytes = []
    while True:
        ch = sock.recv(1)
        if ch == b':':
            break
        if not ch:
            raise RuntimeError('connection closed while reading size')
        size_bytes.append(ch)
    length = int(b''.join(size_bytes))
    data = sock.recv(length)
    return json.loads(data)

def send_packet(sock, payload):
    data = json.dumps(payload)
    sock.sendall(f"{len(data)}:{data}".encode())

port = int(os.environ.get('PORT', '6081'))
with socket.create_connection(('127.0.0.1', port)) as sock:
    hello = read_packet(sock)
    print('root:', json.dumps(hello, indent=2))
    send_packet(sock, {"to": "root", "type": "listTabs"})
    reply = read_packet(sock)
    print('listTabs:', json.dumps(reply, indent=2))
PY
```

`DEVTOOLS_DEBUG=1` writes `>>`/`<<` packets to `/tmp/ladybird-rdp.log`, matching the handshake documented in `.specs/debug/research-ladybird.md`. Attach Firefox via `about:debugging` for full tooling once the socket handshake succeeds.

### LynxJS / PrimJS — CDP bridge via Lynx DevTool

```bash
# Start Lynx app + DevTool; then attach any CDP client to the DevTool-provided ws:// URL
echo "Use Lynx DevTool desktop app to obtain ws:// endpoint; then:"
echo 'npx -y wscat -c "ws://<lynx-ws>" -x "{\"id\":1,\"method\":\"Runtime.evaluate\",\"params\":{\"expression\":\"2+2\"}}"'
```

([GitHub][26])

---

# 4) How to **think** about these APIs (mastery map)

* **Start with messaging**: Prove basic signal paths (`postMessage`, Channels, Workers). Many “remote” workflows only need structured messaging—not a debugger. ([MDN Web Docs][15])
* **Pick your transport**: For browsers/Chromium-derivatives, CDP WS is the lingua franca. For Safari family, attach via WebKit’s Inspector. For Firefox, use DevTools RDP (interactive) or **BiDi** (portable automation). ([chromedevtools.github.io][1])
* **Escalate capabilities** by domain: `Runtime` (eval) → `Debugger` (breakpoints/stepping) → `Network` (observe/modify) → `Profiler/Heap` (perf/memory) → `Target` (workers/iframes) → `Emulation` (devices). The nouns don’t change—only the wire grammar does. ([chromedevtools.github.io][1])
* **Portability vs power**: CDP is rich but vendor-specific; **WebDriver BiDi** brings cross-browser parity and is now production-ready in Firefox with growing support elsewhere (Puppeteer, Cypress). Use BiDi when you must run everywhere; use native protocols when you need the deepest hooks. ([Chrome for Developers][19])
* **Memory debugging workflow**: Start with `Runtime.getHeapUsage` to monitor trends, escalate to sampling heap profiler (low overhead) when growth is suspected, then capture full heap snapshots for leak analysis. Use three-snapshot technique (baseline → action → repeat → compare) to isolate leaked objects. Always force GC before snapshots for consistency. See `.specs/debug/research-memory.md` for heap snapshot format, allocation tracking, retainer path analysis, and cross-runtime profiling strategies.

---

# 5) Caveats, counter-views, and security

* **Firefox CDP**: not enabled by default anymore; prefer BiDi/RDP. You can toggle `remote.active-protocols` if you must, but future is BiDi. ([fxdx.dev][27])
* **Ladybird**: ships a documented Firefox-compatible RDP server; enable `--devtools` and consult `Documentation/DevTools.md` (see `.specs/debug/research-ladybird.md`) for watcher details and known disconnect issues.
* **Bun vs CDP**: Bun speaks **WebKit Inspector**, not CDP; you’ll use its hosted inspector UI (`debug.bun.sh`) instead of Chrome’s DevTools. ([Bun][6])
* **React Native**: new **React Native DevTools** replaces Flipper/old Chrome-based flows; for JSC (not Hermes), use Safari’s Direct JSC debugging. ([React Native][7])
* **Security**: exposing a debug port is **code execution**—bind to loopback, tunnel via ADB/SSH only. ([kenneth.io][28])

---

# 6) Where to go next (build your own devtools)

* **CDP viewer + sender**: start with `Runtime.evaluate`, then add `Debugger.enable`, `setBreakpointByUrl`, `Network.enable`. Chrome’s protocol viewer + command editor makes this trivial. ([chromedevtools.github.io][1])
* **WebDriver BiDi client**: stand up a tiny WS client that does `session.new` → `browsingContext.create` → `script.evaluate`. Then layer logging/network events. ([W3C][29])
* **Inspector shims**: for mixed fleets (Hermes, JSC, PrimJS), normalize to a small internal RPC (eval/pause/breakpoints) and write thin adapters to CDP/WebKit/RDP.

---

## Appendix: “basic `postMessage` RPC” (browser)

```html
<script>
  // parent ⇄ iframe RPC (one capability you can use everywhere)
  const iframe = document.querySelector('iframe')
  const call = (method, params) =>
    new Promise(res => {
      const id = Math.random().toString(36).slice(2)
      const onmsg = e => e.data?.id===id && (window.removeEventListener('message', onmsg), res(e.data.result))
      window.addEventListener('message', onmsg)
      iframe.contentWindow.postMessage({id, method, params}, '*')
    })
  // in the iframe:
  // window.addEventListener('message', e => { const {id, method, params}=e.data; e.source.postMessage({id, result: self[method](...(params||[]))}, '*') })
</script>
```

(Then graduate to a real debugger protocol once your mental model is warm.) ([MDN Web Docs][15])

---

If you want this turned into a printable PDF or broken into repo-friendly Markdown files (matrix.md, taxonomy.md, quickstarts.md), say **“brief mode”** and which format you prefer.

[1]: https://chromedevtools.github.io/devtools-protocol/?utm_source=chatgpt.com "Chrome DevTools Protocol - GitHub Pages"
[2]: https://webkit.org/web-inspector/enabling-web-inspector/?utm_source=chatgpt.com "Enabling Web Inspector"
[3]: https://firefox-source-docs.mozilla.org/devtools/backend/protocol.html?utm_source=chatgpt.com "Remote Debugging Protocol - Firefox Source Docs - Mozilla"
[4]: https://nodejs.org/api/inspector.html?utm_source=chatgpt.com "Inspector | Node.js v24.8.0 Documentation"
[5]: https://docs.deno.com/runtime/fundamentals/debugging/?utm_source=chatgpt.com "Debugging"
[6]: https://bun.com/guides/runtime/web-debugger?utm_source=chatgpt.com "Debugging Bun with the web debugger"
[6a]: https://developers.cloudflare.com/workers/observability/debugging/?utm_source=chatgpt.com "Debugging Workers - Cloudflare Workers"
[7]: https://reactnative.dev/blog/2024/10/23/release-0.76-new-architecture?utm_source=chatgpt.com "React Native 0.76 - New Architecture by default, ..."
[8]: https://reactnative.dev/docs/debugging?utm_source=chatgpt.com "Debugging Basics"
[9]: https://docs.nativescript.org/guide/debugging?utm_source=chatgpt.com "Debugging"
[10]: https://electronjs.org/docs/latest/tutorial/debugging-main-process?utm_source=chatgpt.com "Debugging the Main Process"
[11]: https://book.servo.org/hacking/using-devtools.html?utm_source=chatgpt.com "Using DevTools - The Servo Book"
[12]: https://ladybird.org/?utm_source=chatgpt.com "Ladybird Browser"
[13]: https://github.com/lynx-family/primjs?utm_source=chatgpt.com "lynx-family/primjs: JavaScript Engine Optimized for Lynx"
[14]: https://www.graalvm.org/latest/tools/chrome-debugger/?utm_source=chatgpt.com "Chrome Debugger"
[15]: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage?utm_source=chatgpt.com "Window: postMessage() method - Web APIs | MDN - Mozilla"
[16]: https://developer.chrome.com/blog/cdp-command-editor?utm_source=chatgpt.com "Craft your Chrome Devtools Protocol (CDP) commands ..."
[17]: https://developer.chrome.com/docs/devtools?utm_source=chatgpt.com "DevTools - Chrome for Developers"
[18]: https://stackoverflow.com/questions/66744731/attach-debugger-to-worker-from-chrome-devtools-extension?utm_source=chatgpt.com "Attach debugger to worker from chrome devtools extension"
[19]: https://developer.chrome.com/blog/firefox-support-in-puppeteer-with-webdriver-bidi?utm_source=chatgpt.com "WebDriver BiDi production-ready in Firefox, Chrome and ..."
[20]: https://learn.microsoft.com/en-us/microsoft-edge/devtools/protocol/?utm_source=chatgpt.com "Microsoft Edge DevTools Protocol"
[21]: https://nodejs.org/api/debugger.html?utm_source=chatgpt.com "Debugger | Node.js v24.8.0 Documentation"
[22]: https://developer.chrome.com/docs/devtools/remote-debugging?utm_source=chatgpt.com "Remote debug Android devices | Chrome DevTools"
[23]: https://dataswamp.org/~solene/2024-08-06-remote-firefox-debug.html?utm_source=chatgpt.com "Solene'% : Using Firefox remote debugging feature"
[24]: https://bun.com/docs/runtime/debugger?utm_source=chatgpt.com "Debugger – Runtime | Bun Docs"
[25]: https://reactnative.dev/docs/react-native-devtools?utm_source=chatgpt.com "React Native DevTools"
[26]: https://github.com/lynx-family/lynx-devtool?utm_source=chatgpt.com "lynx-family/lynx-devtool: Debug Lynx On-the-Fly"
[27]: https://fxdx.dev/deprecating-cdp-support-in-firefox-embracing-the-future-with-webdriver-bidi/?utm_source=chatgpt.com "Deprecating CDP Support in Firefox: Embracing the Future ..."
[28]: https://kenneth.io/post/use-chrome-devtools-to-debug-your-users-browser-remotely-with-browserremote?utm_source=chatgpt.com "Use Chrome DevTools to debug your user's browser remotely ..."
[29]: https://www.w3.org/TR/webdriver-bidi/?utm_source=chatgpt.com "WebDriver BiDi - W3C"
[30]: https://github.com/google/ios-webkit-debug-proxy "ios-webkit-debug-proxy"
