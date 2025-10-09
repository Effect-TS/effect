# Task 005: Cloudflare Workers CDP Support

**Status**: Not Started  
**Priority**: Medium  
**Depends On**: CDP implementation (Chrome/Chromium support)  
**Research**: `.specs/debug/research-cloudflare-workers.md`

## Objective
Enable the `@effect-native/debug` service to connect to Cloudflare Workers running locally via `wrangler dev`, leveraging the V8 Inspector Protocol (CDP dialect) exposed on the inspector port. This allows Effect programs to evaluate code, set breakpoints, and inspect the worker runtime during local development.

## User Story
As a developer building Cloudflare Workers applications with Effect, I want to attach the `Debug` service to my local `wrangler dev` instance so that I can programmatically inspect bindings, evaluate expressions in the worker context, and debug my worker code from Effect programs without manually using Chrome DevTools.

## Requirements (EARS)

### Event-Driven
- [E1] When given a Cloudflare Workers inspector endpoint (default `http://127.0.0.1:9229`), the system shall discover available worker targets via the `/json` HTTP endpoint.
- [E2] When a worker is restarted due to file changes (wrangler hot reload), the system shall detect the WebSocket disconnection and support reconnection to the new inspector session.

### State-Driven
- [S1] While connected to a worker inspector, the system shall maintain the worker's execution context state so that sequential `Runtime.evaluate` commands execute in the same global scope.
- [S2] When inspecting worker bindings (KV, R2, D1, Durable Objects), the system shall expose these via the same `Debug` interface used for other CDP targets without protocol-specific extensions.

### Optional
- [O1] When reconnection is enabled, the system shall implement exponential backoff to handle wrangler dev restart scenarios gracefully.
- [O2] When source maps are available (default in wrangler dev), the system shall preserve source map URLs in debugger responses for TypeScript debugging.

## Acceptance Criteria

### AC-E1: Worker Target Discovery
```typescript
// Given wrangler dev running on port 9229
const program = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  const targets = yield* debug.discoverTargets({ 
    endpoint: "http://127.0.0.1:9229" 
  })
  
  // Should find at least one workerd target
  assert(targets.length > 0)
  assert(targets[0].type === "node" || targets[0].title.includes("workerd"))
})
```

### AC-E2: Auto-Reconnect on Worker Restart
```typescript
// Given a connected worker that restarts
const program = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  yield* debug.connect({ 
    endpoint: "http://127.0.0.1:9229",
    reconnect: true,
    reconnectDelay: Duration.millis(100)
  })
  
  // First command succeeds
  const result1 = yield* debug.sendCommand({
    method: "Runtime.evaluate",
    params: { expression: "1+1", returnByValue: true }
  })
  
  // Worker restarts (manual trigger in test)
  // Second command should auto-reconnect and succeed
  const result2 = yield* debug.sendCommand({
    method: "Runtime.evaluate",
    params: { expression: "2+2", returnByValue: true }
  })
  
  assert(result2.result.value === 4)
})
```

### AC-S1: Worker Context Preservation
```typescript
// Global scope mutations persist across commands in same session
const program = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  
  // Set a global variable
  yield* debug.sendCommand({
    method: "Runtime.evaluate",
    params: { expression: "globalThis.TEST_VAR = 42" }
  })
  
  // Read it back in next command
  const result = yield* debug.sendCommand({
    method: "Runtime.evaluate",
    params: { expression: "globalThis.TEST_VAR", returnByValue: true }
  })
  
  assert(result.result.value === 42)
})
```

### AC-S2: Bindings Inspection
```typescript
// Worker bindings are accessible via globalThis
const program = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  
  // List all bindings and globals
  const result = yield* debug.sendCommand({
    method: "Runtime.evaluate",
    params: { 
      expression: "Object.keys(globalThis).filter(k => !k.startsWith('__'))",
      returnByValue: true
    }
  })
  
  // Should include worker APIs
  const keys = result.result.value as string[]
  assert(keys.includes("fetch") || keys.includes("Request"))
})
```

## Technical Specifications

### Protocol Compatibility
- Cloudflare Workers local dev (workerd) exposes V8 Inspector Protocol, which is a CDP dialect.
- Discovery endpoint: `GET http://127.0.0.1:9229/json` returns array of targets with `webSocketDebuggerUrl`.
- Same CDP message format as Chrome/Chromium targets.
- No protocol extensions needed; reuse existing CDP implementation.

### Transport Details
- **Discovery**: HTTP GET to `/json` endpoint (same as Chrome).
- **Connection**: WebSocket to the `webSocketDebuggerUrl` from discovery response.
- **Reconnection**: Wrangler dev closes inspector on file changes; implement reconnect logic.
- **Framing**: Standard CDP JSON messages over WebSocket (no length prefixes).

### Workerd-Specific Considerations
- **Global Scope**: Workers use Service Worker API surface (no DOM, limited WebAPIs).
- **Bindings**: KV, R2, D1, Durable Objects accessible via `globalThis` but may be request-scoped.
- **Hot Reload**: Wrangler watches files and restarts worker, closing inspector connection.
- **Source Maps**: Automatically generated for TypeScript; debugger responses include source map URLs.

### Implementation Notes
- Extend existing CDP connector to support workerd targets (same protocol, different discovery).
- Add optional reconnection strategy with configurable backoff.
- Test with both JavaScript and TypeScript workers (ensure source maps work).
- Document production limitations (no inspector in production Workers).

## Out of Scope
- Production Workers debugging (not supported by Cloudflare; use `wrangler tail` instead).
- Request-scoped binding access (bindings outside fetch handler may be undefined).
- Advanced workerd features (Durable Objects debugging, multi-worker coordination).
- Wrangler CLI integration (assume user runs `wrangler dev` manually).

## Testing Requirements

### Unit Tests
- Mock WebSocket and HTTP responses to simulate workerd discovery and connection.
- Test reconnection logic with simulated connection drops.
- Validate CDP message format matches workerd expectations.

### Integration Tests
- **Hard-fail requirement**: Tests must fail loudly if `wrangler dev` is not running.
- Start a test worker with `wrangler dev --inspector-port=9229` in CI setup.
- Test discovery, connection, evaluate, and disconnection flows.
- Test global scope persistence across multiple commands.
- Test reconnection on simulated restart (kill and restart wrangler).

### Test Worker Setup
```typescript
// test-fixtures/cloudflare-worker/src/index.ts
export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(JSON.stringify({ 
      msg: "Test Worker",
      url: request.url 
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
```

### CI Considerations
- Install wrangler in CI: `npm install -g wrangler`
- Start worker in background: `wrangler dev --inspector-port=9229 &`
- Wait for inspector to be ready: poll `/json` endpoint until it responds.
- Clean up processes after tests: `pkill -f wrangler` or track PIDs.

## Success Metrics
- [SM-E1] Integration test successfully discovers workerd target from wrangler dev (validates AC-E1).
- [SM-E2] Reconnection test passes with simulated wrangler restart (validates AC-E2).
- [SM-S1] Global variable persistence test passes (validates AC-S1).
- [SM-S2] Bindings inspection test successfully lists worker globals (validates AC-S2).
- [SM-DOC] Documentation includes production debugging alternatives (wrangler tail, structured logging).

## Documentation Requirements
- Add "Cloudflare Workers" section to main Debug service README.
- Document wrangler dev setup (`wrangler init`, `wrangler dev --inspector-port=9229`).
- Explain production limitations (no inspector access, use tail workers).
- Provide example of inspecting worker bindings programmatically.
- Link to `.specs/debug/research-cloudflare-workers.md` for protocol details.

## Future Considerations
- **Workerd binary**: Support connecting to standalone `workerd` instances (not just wrangler).
- **Multiple workers**: Handle wrangler dev with multiple workers (routes, different entry points).
- **Miniflare integration**: Support Miniflare's inspector (now integrated into wrangler 3.x).
- **Durable Objects**: Provide helpers for inspecting DO instances and storage.
- **Production telemetry**: Integrate with Workers Analytics Engine for production insights.

## References
- Research: `.specs/debug/research-cloudflare-workers.md`
- Wrangler docs: https://developers.cloudflare.com/workers/wrangler/
- Workerd GitHub: https://github.com/cloudflare/workerd
- CDP Spec: https://chromedevtools.github.io/devtools-protocol/
- Workers debugging guide: https://developers.cloudflare.com/workers/observability/debugging/