# Cloudflare Workers Debugging Overview

This directory contains comprehensive documentation for debugging Cloudflare Workers across both local development and production environments.

## Quick Navigation

### Local Development (Inspector Protocol)
**File**: `research-cloudflare-workers.md`

Covers CDP-based debugging during local development:
- Inspector protocol access via `wrangler dev`
- Chrome DevTools connection
- VSCode debugger integration
- Heap snapshots and profiling
- Breakpoint debugging
- Source map support

**Use When**: Debugging locally with breakpoints, inspecting heap, evaluating expressions in DevTools.

### Production Observability
**File**: `research-cloudflare-workers-production.md`

Covers production debugging and observability:
- Memory limits (128 MB) and CPU limits (5 min)
- Streaming patterns to avoid OOM
- Structured logging and tail workers
- Dashboard metrics and traces
- Guardrails and anti-patterns
- Miniflare local reproduction
- Quick triage checklist

**Use When**: Debugging production issues, optimizing for memory/CPU, implementing observability, setting up monitoring.

### Implementation Task
**File**: `tasks/task-005-cloudflare-workers-cdp.md`

Implementation specification for CDP support:
- EARS requirements
- Acceptance criteria
- Test specifications
- Integration with `@effect-native/debug` service

**Use When**: Implementing the Debug service for Workers.

## Key Differences: Local vs. Production

| Aspect | Local Development | Production |
|--------|------------------|------------|
| **Protocol Access** | Full CDP via inspector | None (logs only) |
| **Debugging Method** | Breakpoints, DevTools | Structured logs, traces |
| **Memory Profiling** | Heap snapshots | Indirect via streaming patterns |
| **Limits Enforcement** | Approximate (Miniflare) | Strict (128 MB, 5 min CPU) |
| **Tools** | `wrangler dev`, Chrome DevTools | `wrangler tail`, Dashboard |

## Common Workflows

### 1. Debug Local OOM Issue
1. Start: `wrangler dev` → press **D** → Memory tab
2. Take baseline heap snapshot
3. Trigger suspected leak action
4. Take second snapshot → Compare
5. Identify retained objects and fix
6. Reference: `research-cloudflare-workers.md` (sections: Heap Snapshots)

### 2. Investigate Production Memory Error
1. Review logs: `wrangler tail --format=json`
2. Check Dashboard → Observability → Error rate spike
3. Identify route/endpoint with failures
4. Reproduce locally with `wrangler dev --remote`
5. Apply streaming patterns from `research-cloudflare-workers-production.md`
6. Deploy fix, verify in Dashboard metrics

### 3. Profile CPU Usage
1. Local: Use CDP `Profiler.start()` / `Profiler.stop()` (see `research-cloudflare-workers.md`)
2. Production: Check Dashboard CPU time metrics
3. If over budget: Apply streaming or raise limit (see `research-cloudflare-workers-production.md`)

### 4. Set Up Observability for New Worker
1. Deploy with source maps: `wrangler deploy --upload-sourcemaps`
2. Create Tail Worker for structured telemetry (snippet in `research-cloudflare-workers-production.md`)
3. Set up log sink (S3, ClickHouse, etc.)
4. Add budget checks for payload sizes
5. Configure Dashboard alerts for error rate

## Integration with @effect-native/debug

The `@effect-native/debug` service will support Cloudflare Workers in two ways:

### Local Development (CDP)
```typescript
const debug = yield* Debug.Debug

yield* debug.connect({ 
  endpoint: "http://127.0.0.1:9229",
  type: "cdp" 
})

const result = yield* debug.sendCommand({
  method: "Runtime.evaluate",
  params: { expression: "typeof Request", returnByValue: true }
})
```

### Future: Production Observability
```typescript
const obs = yield* CloudflareObservability.CloudflareObservability

const logs = yield* obs.tailWorker("my-worker")

yield* Stream.runForEach(logs, log => 
  Console.log(`[${log.outcome}] ${log.logs}`)
)
```

## References

- **Local CDP Debugging**: `research-cloudflare-workers.md`
- **Production Observability**: `research-cloudflare-workers-production.md`
- **Memory Profiling Protocols**: `research-memory.md`
- **Implementation Task**: `tasks/task-005-cloudflare-workers-cdp.md`
- **General Instructions**: `instructions.md`

## Quick Links

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Observability](https://developers.cloudflare.com/workers/observability/)
- [Workerd GitHub](https://github.com/cloudflare/workerd)
