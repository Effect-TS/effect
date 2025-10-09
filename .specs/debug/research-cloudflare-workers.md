# Cloudflare Workers Debugging Research

## Summary

- Cloudflare Workers run on the `workerd` runtime (open-source V8-based engine) and expose the **V8 Inspector Protocol** (CDP dialect) during local development via `wrangler dev`.
- The inspector protocol is available on both HTTP and WebSocket transports, with DevTools discovery endpoints at `/json` and `/json/list` following Chrome's conventions.
- Remote debugging of production Workers is not directly supported via inspector protocol; production debugging relies on logs, tail workers, and Durable Objects debugging features.
- Local development supports full CDP capabilities including `Runtime.evaluate`, `Debugger.*`, `Profiler.*`, and console API interception.

**Scope**: This document covers **local development CDP debugging** (inspector protocol, breakpoints, heap snapshots). For **production observability** (logs, traces, memory/CPU limits, streaming patterns), see `.specs/debug/research-cloudflare-workers-production.md`.

## Transport & Tooling

### Local Development (wrangler dev)

- **Wrangler 3.x** starts a local `workerd` instance with inspector enabled by default on port `9229` (configurable).
- Discovery endpoint: `http://127.0.0.1:9229/json` returns target metadata including WebSocket URLs.
- Chrome DevTools can connect via `chrome://inspect` or by opening the devtools URL directly.
- VSCode debugger integrates via the `launch.json` configuration with `pwa-node` type and `9229` port.

### Workerd Standalone

- The open-source `workerd` binary supports `--inspector-address` flag to expose the inspector on a specific host:port.
- Example: `workerd serve config.capnp --inspector-address=127.0.0.1:9229` enables CDP access.
- Configuration file can specify multiple workers with isolated inspector targets.

### Remote/Production

- **No direct CDP access** to production Workers; Cloudflare's distributed architecture doesn't expose individual V8 isolates.
- **Tail Workers**: Real-time log streaming via `wrangler tail <worker-name>` shows console output and uncaught exceptions.
- **Durable Objects Debugger**: Available in dashboard for inspecting DO state, but not a full inspector protocol.
- **LogPush/Analytics**: Structured logging and performance data via dashboard or Workers Analytics Engine.

## Message Flow

### Discovery & Connection

1. Start local worker: `wrangler dev --inspector-port=9229`
2. Query discovery endpoint:
   ```bash
   curl http://127.0.0.1:9229/json
   ```
   Returns array of targets with `webSocketDebuggerUrl` fields.
3. Connect WebSocket to the target URL (e.g., `ws://127.0.0.1:9229/devtools/inspector/...`).

### Command Execution

1. Enable runtime domain:
   ```json
   { "id": 1, "method": "Runtime.enable" }
   ```
2. Evaluate code in worker context:
   ```json
   {
     "id": 2,
     "method": "Runtime.evaluate",
     "params": { "expression": "globalThis.MY_BINDING", "returnByValue": true }
   }
   ```
3. Set breakpoints:
   ```json
   {"id":3,"method":"Debugger.enable"}
   {"id":4,"method":"Debugger.setBreakpointByUrl","params":{"lineNumber":10,"url":"file:///worker.js"}}
   ```

### Event Handling

- Console messages arrive as `Runtime.consoleAPICalled` events with `type` (log/warn/error) and `args`.
- Debugger paused events include call frames, scopes, and local variables.
- Script parsing events (`Debugger.scriptParsed`) provide source maps and execution context details.

## Paste-and-Run Examples

### Local Worker with Inspector

```bash
# Start a simple worker with inspector enabled
npx wrangler init my-worker --yes
cd my-worker

# Create a basic worker
cat > src/index.ts << 'EOF'
export default {
  async fetch(request: Request): Promise<Response> {
    console.log('Request received:', request.url);
    const result = { message: 'Hello from Worker!', time: new Date().toISOString() };
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
EOF

# Start dev server with inspector
npx wrangler dev --inspector-port=9229 &
sleep 2

# Discover inspector targets
WS=$(curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl')

# Connect and evaluate expression
npx -y wscat -c "$WS" -x '{"id":1,"method":"Runtime.evaluate","params":{"expression":"2+2","returnByValue":true}}'
# Expect: {"id":1,"result":{"result":{"type":"number","value":4}}}

# Evaluate in worker global scope
npx -y wscat -c "$WS" -x '{"id":2,"method":"Runtime.evaluate","params":{"expression":"typeof fetch","returnByValue":true}}'
# Expect: {"id":2,"result":{"result":{"type":"string","value":"function"}}}
```

### VSCode Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Wrangler Dev",
      "type": "pwa-node",
      "request": "attach",
      "port": 9229,
      "cwd": "${workspaceFolder}",
      "skipFiles": ["<node_internals>/**"],
      "resolveSourceMapLocations": [
        "${workspaceFolder}/**",
        "!**/node_modules/**"
      ]
    }
  ]
}
```

Then run `wrangler dev --inspector-port=9229` and attach via VSCode debugger.

### Chrome DevTools Connection

```bash
# Start worker
npx wrangler dev --inspector-port=9229

# Open Chrome and navigate to:
# chrome://inspect
#
# Click "Configure..." and add localhost:9229
# Wait for target to appear, then click "inspect"
```

### Programmatic Debugging with CDP Client

```typescript
import CDP from "chrome-remote-interface"

// Connect to local wrangler dev instance
const client = await CDP({ port: 9229 })
const { Runtime, Debugger } = client

// Enable domains
await Runtime.enable()
await Debugger.enable()

// Evaluate in worker context
const result = await Runtime.evaluate({
  expression: 'globalThis.navigator?.userAgent || "workerd"',
  returnByValue: true
})

console.log("Result:", result.result.value)

// Set breakpoint
await Debugger.setBreakpointByUrl({
  lineNumber: 5,
  url: "file:///worker.js"
})

await client.close()
```

## Workerd Specific Features

### Bindings Inspection

- Workers bindings (KV, R2, D1, Durable Objects) are accessible via `globalThis` in the inspector.
- Example: Evaluate `Object.keys(globalThis)` to see all bindings and globals.
- **Note**: Some bindings like KV namespaces require async operations that may not complete in simple `evaluate` calls.

### Source Maps

- Wrangler dev automatically generates and serves source maps for TypeScript workers.
- DevTools will show original TypeScript source when breakpoints are set.
- Source map URLs follow the pattern: `//# sourceMappingURL=data:application/json;base64,...`

### Service Worker API Surface

- Workers implement a subset of the Service Worker API (fetch event, caches, etc.).
- Not all browser APIs are available (no DOM, limited WebAPIs).
- Evaluate `Object.getOwnPropertyNames(globalThis)` to see available APIs.

### Isolate Lifecycle

- Each request runs in a V8 isolate that may be reused for subsequent requests.
- Local dev isolate persists across requests; inspector state is maintained.
- **Cold starts**: First request may show different behavior than subsequent requests.

## Troubleshooting

### Inspector Port Already in Use

```bash
# Check what's using port 9229
lsof -i :9229

# Use a different port
npx wrangler dev --inspector-port=9230
```

### WebSocket Connection Refused

- Ensure `wrangler dev` is running and fully started (watch for "Ready on http://..." message).
- Check that firewall/network settings allow localhost connections.
- Verify the WebSocket URL from `/json` endpoint matches your connection attempt.

### Breakpoints Not Hitting

- Ensure source maps are enabled (default in wrangler dev).
- Set breakpoints in the original source file, not generated JavaScript.
- Check that the file path in `Debugger.setBreakpointByUrl` matches the script URL from `Debugger.scriptParsed` events.
- Try `debugger;` statement in source code as a fallback.

### Production Debugging Limitations

- **Cannot attach inspector to production Workers** - use structured logging instead.
- Use `console.log()` for development; avoid verbose logging in production (costs money).
- Implement structured error handling and send critical errors to external services (Sentry, LogDNA, etc.).
- Use **Tail Workers** for real-time production log streaming: `wrangler tail <worker-name>`.

**For comprehensive production observability guidance** (memory/CPU limits, streaming patterns, instrumentation, guardrails), see `.specs/debug/research-cloudflare-workers-production.md`.

### Bindings Not Available in Inspector

- Some bindings are request-scoped and only available inside the fetch handler.
- To inspect binding data, log it within the handler or return it in the response during dev.
- Environment bindings are available at the module scope but may not populate until first request.

## Advanced Debugging Techniques

### CPU Profiling

```typescript
// In worker code, trigger profiling via CDP:
// 1. Connect inspector
// 2. Enable Profiler domain
// 3. Start profiling before sending requests
// 4. Stop profiling and retrieve profile data

import CDP from "chrome-remote-interface"

const client = await CDP({ port: 9229 })
const { Profiler } = client

await Profiler.enable()
await Profiler.start()

// Generate load...
await fetch("http://127.0.0.1:8787/heavy-endpoint")

const { profile } = await Profiler.stop()
console.log("Profile:", JSON.stringify(profile, null, 2))
```

### Heap Snapshots

```bash
# Connect inspector and enable HeapProfiler
npx -y wscat -c "$(curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl')"

# Then send:
{"id":1,"method":"HeapProfiler.enable"}
{"id":2,"method":"HeapProfiler.takeHeapSnapshot"}
# Snapshot data streams as events
```

### Network Interception (Fetch Mocking)

```json
{"id":1,"method":"Fetch.enable","params":{"patterns":[{"urlPattern":"*"}]}}
{"id":2,"method":"Fetch.continueRequest","params":{"requestId":"<id-from-event>"}}
```

**Note**: Fetch domain support may vary in workerd versions.

## Comparison with Other Runtimes

| Feature              | Cloudflare Workers (workerd) | Node.js          | Deno             | Bun                 |
| -------------------- | ---------------------------- | ---------------- | ---------------- | ------------------- |
| Protocol             | V8 Inspector (CDP)           | V8 Inspector     | V8 Inspector     | WebKit Inspector    |
| Local Inspector      | ✅ via wrangler dev          | ✅ --inspect     | ✅ --inspect     | ✅ --inspect        |
| Production Inspector | ❌ Logs only                 | ✅ (self-hosted) | ✅ (self-hosted) | ✅ (self-hosted)    |
| Source Maps          | ✅ Automatic                 | ✅               | ✅               | ✅                  |
| VSCode Integration   | ✅                           | ✅               | ✅               | ✅                  |
| Chrome DevTools      | ✅                           | ✅               | ✅               | ✅ via debug.bun.sh |
| Hot Reload           | ✅ Built-in                  | ⚠️ via nodemon   | ✅ --watch       | ✅ --hot            |

## Security Considerations

### Local Development

- Inspector port is typically bound to `127.0.0.1` only, but can be configured to bind to `0.0.0.0`.
- **Never expose inspector port to public networks** - it provides full code execution access.
- Use SSH tunneling for remote debugging: `ssh -L 9229:127.0.0.1:9229 user@remote-host`

### Production

- Cloudflare does not expose inspector protocol for production Workers (by design - security and multi-tenancy).
- Secrets in environment variables are accessible via inspector during local dev - **never commit secrets to code**.
- Use wrangler secrets for production; local dev can use `.dev.vars` file (gitignored by default).

## References

### Official Documentation

- Wrangler CLI: `https://developers.cloudflare.com/workers/wrangler/`
- Workers Debugging Guide: `https://developers.cloudflare.com/workers/observability/debugging/`
- Workerd GitHub: `https://github.com/cloudflare/workerd`
- Workers Runtime APIs: `https://developers.cloudflare.com/workers/runtime-apis/`

### Inspector Protocol

- Chrome DevTools Protocol: `https://chromedevtools.github.io/devtools-protocol/`
- V8 Inspector: `https://v8.dev/docs/inspector`
- Chrome Remote Interface (Node.js CDP client): `https://github.com/cyrus-and/chrome-remote-interface`

### Community Resources

- Workers Discord: `https://discord.gg/cloudflaredev`
- Cloudflare Community: `https://community.cloudflare.com/c/developers/workers/`
- Miniflare (Workers simulator): `https://miniflare.dev/` (now integrated into wrangler)

### Related Tools

- Vitest + Cloudflare Workers: `https://developers.cloudflare.com/workers/testing/vitest-integration/`
- Workers TypeScript Types: `@cloudflare/workers-types` package
- Wrangler GitHub: `https://github.com/cloudflare/workers-sdk`

## Integration with @effect-native/debug

### Protocol Compatibility

- Cloudflare Workers local dev is **fully compatible** with CDP-based debug implementations.
- Use the same `Debug` service interface as Chrome/Chromium targets.
- Discovery via HTTP `/json` endpoint matches Chrome's convention.

### Implementation Notes

- Workers runtime is **ephemeral during dev** - reconnection logic should handle restarts gracefully.
- Wrangler dev watches files and restarts the worker, which closes and reopens the inspector.
- Consider implementing auto-reconnect with exponential backoff for file-watch scenarios.

### Example Effect Integration

```typescript
import * as Effect from "effect/Effect"
import * as Debug from "@effect-native/debug"

const program = Effect.gen(function* () {
  const debug = yield* Debug.Debug

  // Connect to local wrangler dev
  yield* debug.connect({
    endpoint: "http://127.0.0.1:9229",
    type: "cdp"
  })

  // Evaluate in worker context
  const result = yield* debug.sendCommand({
    method: "Runtime.evaluate",
    params: {
      expression: "typeof Request",
      returnByValue: true
    }
  })

  Console.log("Worker global check:", result.result.value)

  yield* debug.disconnect()
})
```

### Testing Considerations

- Local wrangler dev must be running before tests execute.
- Consider using `workerd` binary directly in CI for faster, more reliable test setup.
- Mock Worker bindings in unit tests; integration tests should use actual local dev server.
- Hard-fail tests if inspector port is unreachable (per `.patterns/testing-patterns.md`).
