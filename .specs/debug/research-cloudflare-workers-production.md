# Cloudflare Workers Production Observability & Debugging

## Summary

Production Cloudflare Workers run on the `workerd` runtime in a distributed, multi-tenant environment with strict resource limits and no direct inspector protocol access. Debugging production Workers requires a shift from traditional breakpoint-based debugging to instrumentation-first observability: structured logs, tail workers, traces, metrics, and streaming-aware patterns. This document covers production constraints, local reproduction techniques (Miniflare), memory/CPU limits, streaming patterns to avoid OOM, and guardrails for building fast, stable Workers.

**Key Constraints:**

- **No CDP Access**: Production Workers do not expose inspector protocol; local dev only.
- **Memory Limit**: ~128 MB per Worker invocation.
- **CPU Limit**: Up to 5 minutes CPU-time per request (older bundled Workers may have 50ms caps).
- **Observability**: Logs (`wrangler tail`), Tail Workers, Dashboard traces/metrics, LogPush/Analytics.

**Outcome → Obstacles → Plan:**
Ship a fast, stable Cloudflare Worker, with clear signals when it fails.
Unknown limits, opaque memory/CPU behavior, and env diffs between local and edge.
Instrument first, then measure, then minimize: logs → traces → local repro (Miniflare) → fix patterns → guardrails.

## Resource Limits Reference

### Memory Limits

- **Per-Request Cap**: ~128 MB heap per Worker invocation.
- **Symptom**: Worker terminates with "Exceeded memory limit" or silent crash.
- **Mitigation**: Stream large payloads instead of buffering; avoid global caches without bounds.
- **Reference**: [Cloudflare R2 Workers API Usage](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)

### CPU Limits

- **Standard**: Up to **5 minutes CPU-time** per request (wall-clock can be longer while waiting on I/O).
- **Legacy Bundled**: Older bundled Workers may have **50ms CPU caps** until raised via settings.
- **Symptom**: Worker terminates mid-execution; "CPU time limit exceeded" in logs.
- **Mitigation**: Stream processing, use TransformStreams, offload to Queues/Batch jobs, raise CPU limit if plan allows.
- **Reference**: [Higher CPU Limits Announcement](https://developers.cloudflare.com/changelog/2025-03-25-higher-cpu-limits/)

### Other Limits

- **Subrequests**: 50-1000 depending on plan (configurable).
- **Request Body Size**: 100 MB default (can be raised).
- **Response Body Size**: Unlimited if streamed; 128 MB if buffered.
- **Worker Size**: 1-10 MB compressed script size depending on plan.
- **Reference**: [Workers Platform Limits](https://developers.cloudflare.com/workers/platform/limits/)

## Instrumentation (Local & Production)

### Source Maps & Stack Traces

- **Enable in Wrangler**: Upload source maps for readable stack traces in logs.
- **Build Command**: `wrangler deploy --minify --upload-sourcemaps`
- **Effect**: Production errors show original TypeScript file/line numbers.
- **Reference**: [Workers Observability Overview](https://developers.cloudflare.com/workers/observability/)

### Logs

#### Local Development

- **Wrangler Dev**: `wrangler dev` + press **D** to open DevTools.
- **DevTools Tabs**: Console (logs), Network (fetch requests), Memory (heap snapshots), Sources (breakpoints).
- **Console API**: `console.log()`, `console.warn()`, `console.error()` all visible in DevTools.
- **Reference**: [Profiling Memory in DevTools](https://developers.cloudflare.com/workers/observability/dev-tools/memory-usage/)

#### Production/Edge

- **Wrangler Tail**: `wrangler tail <worker-name>` streams live logs from edge.
- **Dashboard Logs**: Workers → Logs → Query Builder for historical log search.
- **Structured Logging**: Use JSON logs for filtering: `console.log(JSON.stringify({ level: 'error', msg: '...', context: {...} }))`
- **Reference**: [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/)

### Tail Workers

Push structured events from your Worker to a custom sink (S3, ClickHouse, Logtail, etc.):

```typescript
export default {
  async tail(events: TraceEvent[]) {
    await fetch("https://log.example/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        events.map((e) => ({
          ts: e.timestamp,
          logs: e.logs,
          outcome: e.outcome,
          cpuTime: e.cpuTime,
          errors: e.exceptions
        }))
      )
    })
  }
}
```

**Setup**: Wire Tail Worker to main Worker via Dashboard or `wrangler.toml`.
**Reference**: [Tail Workers](https://developers.cloudflare.com/workers/observability/logs/tail-workers/)

### Traces & Metrics (Dashboard)

- **Location**: Workers → Observability tab in Cloudflare Dashboard.
- **Metrics**: Request rate, error rate, CPU time, invocation duration, status code distribution.
- **Filtering**: By route, region, binding, status code.
- **Correlation**: Correlate error spikes with deployments, regions, specific routes.
- **Reference**: [Workers Observability](https://developers.cloudflare.com/workers/observability/)

## Local Reproduction (Miniflare & Wrangler Dev)

### Miniflare Overview

- **What**: Runs `workerd` locally, same runtime as production (but does not strictly enforce all limits).
- **Integration**: Now integrated into `wrangler dev` (Wrangler 3.x).
- **Use Case**: Fast local feedback loop, debugger attachment, memory profiling.
- **Caveat**: Limits (CPU/memory/subrequests) are approximate; verify at edge.
- **Reference**: [Workers Development & Testing](https://developers.cloudflare.com/workers/development-testing/)

### Wrangler Dev with DevTools

```bash
# Start local dev server
wrangler dev

# Press 'D' to open DevTools
# Then use:
# - Console tab: logs, evaluate expressions
# - Network tab: fetch requests, response bodies
# - Memory tab: heap snapshots, allocation profiling
# - Sources tab: set breakpoints, step through code
```

**Reference**: [Profiling Memory in Wrangler Dev](https://developers.cloudflare.com/workers/observability/dev-tools/memory-usage/)

### Attach Debugger (VS Code)

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

Run `wrangler dev --inspector-port=9229` and attach via VS Code debugger.
**Reference**: [Attaching a Debugger](https://developers.cloudflare.com/workers/testing/miniflare/developing/debugger/)

### Profile Memory in DevTools

```bash
wrangler dev

# Press D → Memory tab → Take snapshot
# Hit your route to generate load
# Take second snapshot → Compare
```

**Caveat**: Miniflare does not strictly enforce 128 MB limit; treat as approximation.
**Reference**: [GitHub Issue: Enforce Subrequest Limit](https://github.com/cloudflare/workers-sdk/issues/4359)

## Quick Triage Checklist

When debugging production failures, check these patterns:

### Memory Issues

- [ ] **Streaming vs. Buffering**: Does the route stream bodies or buffer? (Use `request.body.getReader()` or `response.body` pipes; avoid `await req.text()` on large inputs.)
- [ ] **Large JSON Parsing**: Any `JSON.parse()` of large blobs or `ArrayBuffer` built in memory? → Chunk or stream.
- [ ] **Global Caches**: Any global maps/arrays/LRU growing across requests without bounds? → Clear or cap size; prefer KV/R2/DOs.
- [ ] **Body Cloning**: Do you clone bodies repeatedly (`request.clone()` / `response.clone()`)? → Each clone re-reads payload; stream instead.

**Memory Limit**: 128 MB is easy to hit. Stream everything possible.
**Reference**: [R2 Workers API Usage](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)

### CPU Issues

- [ ] **Long Loops**: Any CPU-intensive loops (crypto, parsing, encoding)? → Use streaming, TransformStreams, or push to Queues/Batch jobs.
- [ ] **CPU Limit**: Check if you're on a legacy 50ms cap or modern 5-minute cap.
- [ ] **Raise Limit**: If workload justifies it, raise CPU limit in settings (up to 5 min).

**Reference**: [Higher CPU Limits](https://developers.cloudflare.com/changelog/2025-03-25-higher-cpu-limits/)

### Durable Objects Hot-Key

- [ ] **Sharding**: Is a single Durable Object instance handling all traffic? → Add key sharding.
- [ ] **Skew**: Use `wrangler tail --format=json` to detect hot partitions.

**Reference**: [Durable Objects Troubleshooting](https://developers.cloudflare.com/durable-objects/observability/troubleshooting/)

## Streaming Patterns (Avoid OOM)

### Anti-Pattern: Buffer Entire Response

```typescript
export default {
  async fetch(req: Request) {
    const upstream = await fetch("https://api.example/large-data")
    const body = await upstream.text()
    return new Response(body.toUpperCase())
  }
}
```

**Problem**: Buffers entire response in memory; can OOM on large payloads.

### Pattern: Stream with TransformStream

```typescript
export default {
  async fetch(req: Request) {
    const upstream = await fetch("https://api.example/large-data")

    const transformed = upstream.body!.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk)
          const upper = text.toUpperCase()
          controller.enqueue(new TextEncoder().encode(upper))
        }
      })
    )

    return new Response(transformed)
  }
}
```

**Benefit**: Constant memory usage regardless of payload size.

### Pattern: Streaming JSON Generation

```typescript
export default {
  async fetch(req: Request) {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        let i = 0
        const id = setInterval(() => {
          if (i++ >= 1000) {
            clearInterval(id)
            controller.close()
            return
          }
          controller.enqueue(encoder.encode(`{"line":${i}}\n`))
        }, 1)
      }
    })

    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson" }
    })
  }
}
```

**Reference**: [R2 Workers Streaming](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)

## Minimal Repros (Memory & CPU)

### OOM-Style Repro (Don't Deploy This)

```typescript
export default {
  async fetch() {
    const blocks = []
    for (let i = 0; i < 150; i++) {
      blocks.push(new Uint8Array(1_000_000))
    }
    return new Response(`blocks=${blocks.length}`)
  }
}
```

**Run with**: `wrangler dev` → DevTools → Memory tab → Watch retained arrays.
**Expected**: Local may succeed; edge will terminate when 128 MB is exceeded.

**Fix**: Replace with streaming (see patterns above).

### CPU-Bound Repro

```typescript
export default {
  async fetch() {
    const end = Date.now() + 40_000
    while (Date.now() < end) {
      Math.sqrt(Math.random())
    }
    return new Response("done")
  }
}
```

**Expected**: Termination if CPU cap < workload (legacy 50ms cap will fail; 5-minute cap will pass).
**Fix**: Raise CPU limit in settings if workload justifies it; otherwise offload or stream.
**Reference**: [Workers Pricing & CPU Limits](https://developers.cloudflare.com/workers/platform/pricing/)

## Durable Objects & Stateful Bugs

### Remote Development

```bash
wrangler dev --remote
```

**Why**: Exercises real edge semantics (routing, sticky DO instances, real bindings).
**Use Case**: Debug DO state issues, hot partitions, message loops.

### Common DO Pitfalls

- **Large In-Memory State**: Retaining megabytes of state in DO instance → Move to R2/KV.
- **Unbounded Broadcasting**: Fan-out without backpressure → Add queues or bounded fan-out.
- **Hot Partitions**: Single DO handling all requests → Shard keys.

**Reference**: [Durable Objects Troubleshooting](https://developers.cloudflare.com/durable-objects/observability/troubleshooting/)

## Guardrails (Fail Loudly, Not Silently)

### Budget Checks at Boundaries

```typescript
const MAX_BYTES = 8_000_000

export default {
  async fetch(req: Request) {
    const len = Number(req.headers.get("content-length") ?? 0)
    if (len > MAX_BYTES) {
      return new Response("payload too large", { status: 413 })
    }

    const body = await req.text()
    return new Response(`Received ${body.length} bytes`)
  }
}
```

### Timeouts for Subrequests

```typescript
const TIMEOUT_MS = 5000

export default {
  async fetch(req: Request) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch("https://api.example/slow", {
        signal: controller.signal
      })
      return res
    } catch (err) {
      return new Response("upstream timeout", { status: 504 })
    } finally {
      clearTimeout(timeout)
    }
  }
}
```

### CPU Caps

Set explicit CPU limits in Dashboard/Wrangler to catch regressions early.
**Reference**: [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)

### Tail Worker Telemetry Sink

Log sampled payload sizes, CPU time, memory hints to external analytics:

```typescript
export default {
  async tail(events: TraceEvent[]) {
    const sampled = events.filter(() => Math.random() < 0.1)

    await fetch("https://analytics.example/ingest", {
      method: "POST",
      body: JSON.stringify(
        sampled.map((e) => ({
          ts: e.timestamp,
          cpuTime: e.cpuTime,
          outcome: e.outcome,
          logs: e.logs.filter((l) => l.level === "error")
        }))
      )
    })
  }
}
```

## Common Anti-Patterns → Patterns

| Anti-Pattern              | Pattern                                          | Reference                                                                                              |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Buffer entire body        | Stream with `ReadableStream` / `TransformStream` | [R2 Streaming](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)                    |
| Global LRU without cap    | Bounded cache or KV namespace                    | [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)                           |
| Multi-clone bodies        | Single-pass or `tee()` streams                   | [R2 Streaming](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)                    |
| Single hot Durable Object | Key sharding or Queues for fan-out               | [DO Troubleshooting](https://developers.cloudflare.com/durable-objects/observability/troubleshooting/) |
| Unbounded CPU loops       | Raise CPU limit (if justified) or offload work   | [CPU Limits](https://developers.cloudflare.com/changelog/2025-03-25-higher-cpu-limits/)                |

## Drop-In Snippets

### Log + Measure Wrapper

```typescript
export const withObs =
  (h: (req: Request) => Promise<Response>) => async (req: Request) => {
    const t0 = Date.now()
    try {
      const res = await h(req)
      console.log(
        JSON.stringify({
          ok: true,
          ms: Date.now() - t0,
          route: new URL(req.url).pathname
        })
      )
      return res
    } catch (err) {
      console.error(
        JSON.stringify({
          ok: false,
          ms: Date.now() - t0,
          err: String(err)
        })
      )
      return new Response("internal error", { status: 500 })
    }
  }
```

### Safe Body Reader (Size-Limited)

```typescript
export const readMaybe = async (req: Request) => {
  const ctype = req.headers.get("content-type") ?? ""
  if (!ctype.includes("application/json")) return null

  const reader = req.body?.getReader()
  if (!reader) return null

  let size = 0
  const chunks: Uint8Array[] = []
  const MAX_SIZE = 8_000_000

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    size += value.byteLength
    if (size > MAX_SIZE) {
      throw new Error("payload too large")
    }
    chunks.push(value)
  }

  const buf = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    buf.set(c, offset)
    offset += c.byteLength
  }

  return JSON.parse(new TextDecoder().decode(buf))
}
```

## Tooling Quick Commands

```bash
wrangler dev --remote

wrangler dev

wrangler tail --format=json

wrangler deploy --minify --upload-sourcemaps
```

**References**:

- [Development & Testing](https://developers.cloudflare.com/workers/development-testing/)
- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/)
- [DO Troubleshooting](https://developers.cloudflare.com/durable-objects/observability/troubleshooting/)
- [Debugger Docs](https://developers.cloudflare.com/workers/testing/miniflare/developing/debugger/)

## Counter-Views (Truth Guard)

### "Local OOM ≠ Edge OOM"

**True**: Miniflare approximates limits; always verify at edge with logs/traces.
**Reference**: [GitHub: Enforce Subrequest Limit](https://github.com/cloudflare/workers-sdk/issues/4359)

### "No Wall-Clock Limit = Run Forever"

**Misleading**: CPU is bounded (up to 5 min); upstreams/timeouts will still fail your flow.
**Reference**: [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)

### "Structured Logging Costs Money"

**True**: Every log line counts toward Workers Analytics requests; use sampling in production.

### "Source Maps Always Work"

**False**: Must upload with `--upload-sourcemaps`; missing maps show minified stack traces.

## TL;DR Flow You Can Run Today

1. `wrangler dev` → **D** → **Memory** snapshot while hammering your endpoint.
2. Add **Tail Worker** or `wrangler tail` to capture payload sizes & outcomes.
3. If mem spikes: switch to **streaming**, cap caches, remove clones.
4. If CPU spikes: profile, raise caps if warranted, offload or stream.
5. Re-verify in **Observability** dashboard (logs, queries, traces).

## Pinned Checklist for PRs (Optional Template)

When submitting Worker changes, verify:

- [ ] Streaming: All large payloads use streaming (no `await req.text()` on unbounded input)
- [ ] Budget checks: Request/response size limits enforced
- [ ] Timeouts: Subrequests have abort signals
- [ ] CPU: No unbounded loops; CPU limit appropriate for workload
- [ ] Caches: Global caches bounded or use KV/R2
- [ ] Logs: Structured JSON logs with error context
- [ ] Source maps: Deployed with `--upload-sourcemaps`
- [ ] Tail worker: Telemetry sink configured (if applicable)
- [ ] Local test: Verified in `wrangler dev` with memory profiling
- [ ] Edge test: Deployed to staging, checked Dashboard metrics

## Integration with @effect-native/debug

### Local Development Only

- **CDP Access**: Available via `wrangler dev --inspector-port=9229` (see `research-cloudflare-workers.md`).
- **Heap Snapshots**: Use `HeapProfiler` domain for memory debugging locally.
- **No Production Access**: Inspector protocol not available in production Workers.

### Production Observability via Effect

Potential future integration:

```typescript
import * as Effect from "effect/Effect"
import * as CloudflareObservability from "@effect-native/debug/CloudflareObservability"

const program = Effect.gen(function* () {
  const obs = yield* CloudflareObservability.CloudflareObservability

  const logs = yield* obs.tailWorker("my-worker")

  yield* Stream.runForEach(logs, (log) =>
    Console.log(`[${log.timestamp}] ${log.outcome}: ${log.logs}`)
  )
})
```

**Note**: This would require implementing a `wrangler tail` client or Tail Worker consumer, not inspector protocol.

## References

### Official Documentation

- [Workers Observability](https://developers.cloudflare.com/workers/observability/)
- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/)
- [Tail Workers](https://developers.cloudflare.com/workers/observability/logs/tail-workers/)
- [Memory Profiling in DevTools](https://developers.cloudflare.com/workers/observability/dev-tools/memory-usage/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers Pricing & CPU](https://developers.cloudflare.com/workers/platform/pricing/)
- [Higher CPU Limits Changelog](https://developers.cloudflare.com/changelog/2025-03-25-higher-cpu-limits/)
- [R2 Workers API Usage](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
- [Durable Objects Troubleshooting](https://developers.cloudflare.com/durable-objects/observability/troubleshooting/)
- [Development & Testing](https://developers.cloudflare.com/workers/development-testing/)
- [Attaching a Debugger](https://developers.cloudflare.com/workers/testing/miniflare/developing/debugger/)

### GitHub & Community

- [Workerd GitHub](https://github.com/cloudflare/workerd)
- [Workers SDK GitHub](https://github.com/cloudflare/workers-sdk)
- [Miniflare Subrequest Limit Issue](https://github.com/cloudflare/workers-sdk/issues/4359)
- [Workers Discord](https://discord.gg/cloudflaredev)
- [Cloudflare Community](https://community.cloudflare.com/c/developers/workers/)

### Related Specs

- `.specs/debug/research-cloudflare-workers.md` - Local CDP debugging
- `.specs/debug/research-memory.md` - Heap profiling protocols
- `.specs/debug/tasks/task-005-cloudflare-workers-cdp.md` - CDP implementation task
