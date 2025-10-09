# Memory Debugging Quick Reference

> **TL;DR**: Monitor with `getHeapUsage`, profile with sampling, capture snapshots for leak analysis, use three-snapshot technique to isolate leaks.

## Quick Start

### Setup Inspector (Node.js)
```bash
node --inspect=9229 --expose-gc your-app.js
```

### Setup Inspector (Chrome)
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-profile
```

### Setup Inspector (Deno)
```bash
deno run --inspect=9229 --allow-all your-app.ts
```

### Setup Inspector (Cloudflare Workers)
```bash
wrangler dev --inspector-port=9229
```

## Common Workflows

### 1. Monitor Heap Usage (Lightweight)
```typescript
import * as Effect from "effect/Effect"
import * as Debug from "@effect-native/debug"

const monitor = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  
  const usage = yield* debug.memory.getHeapUsage
  const usedMB = (usage.usedSize / 1024 / 1024).toFixed(2)
  const totalMB = (usage.totalSize / 1024 / 1024).toFixed(2)
  console.log(`Heap: ${usedMB}MB / ${totalMB}MB`)
})
```

### 2. Capture Heap Snapshot
```typescript
const snapshot = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // Stream snapshot to file
  const stream = yield* debug.memory.takeHeapSnapshot
  yield* Stream.run(stream, Sink.file("heap.heapsnapshot"))
})
```

### 3. Detect Memory Leak (Three-Snapshot)
```typescript
const detectLeak = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // 1. Baseline
  yield* debug.memory.collectGarbage
  yield* saveSnapshot("baseline.heapsnapshot")
  
  // 2. First action
  yield* performAction()
  yield* debug.memory.collectGarbage
  yield* saveSnapshot("after-first.heapsnapshot")
  
  // 3. Repeat action (leaks will grow)
  yield* performAction()
  yield* debug.memory.collectGarbage
  yield* saveSnapshot("after-second.heapsnapshot")
  
  // Load in Chrome DevTools: Comparison view
})
```

### 4. Sampling Profiler (Production-Safe)
```typescript
const profile = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // Sample every 64KB (low overhead)
  yield* debug.memory.startSamplingHeapProfiler({ samplingInterval: 65536 })
  
  yield* Effect.sleep(Duration.seconds(60))
  
  const profile = yield* debug.memory.stopSamplingHeapProfiler
  console.log("Top allocations:", profile.head)
})
```

### 5. Verify Memory is Released
```typescript
const verifyCleanup = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  
  const before = yield* debug.memory.getHeapUsage
  
  // Allocate
  yield* allocateLargeObject()
  
  // Cleanup
  yield* cleanupObject()
  yield* debug.memory.collectGarbage
  
  const after = yield* debug.memory.getHeapUsage
  
  if (after.usedSize >= before.usedSize) {
    console.error("Memory was not released!")
  }
})
```

## Command Reference

### Get Heap Usage
```typescript
const usage = yield* debug.memory.getHeapUsage
// Returns: { usedSize: number, totalSize: number }
```

### Take Heap Snapshot (Streaming)
```typescript
const stream = yield* debug.memory.takeHeapSnapshot
// Returns: Stream.Stream<string, DebugError>
// Use: Stream.run(stream, Sink.file("heap.heapsnapshot"))
```

### Force Garbage Collection
```typescript
yield* debug.memory.collectGarbage
// Returns: Effect<void, DebugError>
```

### Start/Stop Sampling Profiler
```typescript
yield* debug.memory.startSamplingHeapProfiler({ samplingInterval: 32768 })
// ... run workload ...
const profile = yield* debug.memory.stopSamplingHeapProfiler
// Returns: SamplingHeapProfile
```

### Start/Stop Allocation Tracking
```typescript
yield* debug.memory.startTrackingAllocations({ trackAllocations: true })
// ... perform operations ...
const timeline = yield* debug.memory.stopTrackingAllocations
// Returns: AllocationTimeline
```

## Analysis with Chrome DevTools

### Load Snapshot
1. Open Chrome DevTools → Memory tab
2. Click "Load" button
3. Select `.heapsnapshot` file
4. View: Summary | Comparison | Containment | Statistics

### Compare Snapshots
1. Load first snapshot (baseline)
2. Load second snapshot (after action)
3. Select second snapshot
4. In dropdown, select "Comparison"
5. Base: first snapshot
6. Look for objects with positive "# Delta" and "Size Delta"

### Find Retainer Path
1. Load snapshot
2. Search for leaked object (by class name or ID)
3. Expand object in list
4. View "Retainers" section
5. Follow chain to GC root
6. Fix the retaining reference

## Common Leak Patterns

### Event Listeners (Browser)
```javascript
// LEAK
element.addEventListener('click', handler)
element.remove()  // Element removed but listener still references it

// FIX
element.removeEventListener('click', handler)
element.remove()
```

### Closures
```javascript
// LEAK
function createClosure() {
  const largeData = new Array(1000000)
  return () => largeData[0]  // Entire array kept alive
}

// FIX
function createClosure() {
  const first = new Array(1000000)[0]  // Only keep what's needed
  return () => first
}
```

### Forgotten Timers
```javascript
// LEAK
const id = setInterval(() => { heavyWork() }, 1000)
// Never cleared

// FIX
const id = setInterval(() => { heavyWork() }, 1000)
clearInterval(id)  // When done
```

### Effect Fibers
```typescript
// LEAK
const fiber = yield* Effect.fork(
  Effect.forever(collectData)  // Never completes
)

// FIX
const fiber = yield* Effect.fork(
  Effect.repeat(collectData, Schedule.recurs(100))  // Bounded
)
yield* Fiber.join(fiber)  // Or interrupt when done
```

## Troubleshooting

### Snapshot File Too Large
- Use sampling profiler instead: `startSamplingHeapProfiler`
- Profile smaller time windows
- Clean up before snapshot: `collectGarbage`

### "Out of Memory" During Snapshot
- Ensure streaming (don't buffer): `Stream.run(snapshot, Sink.file(...))`
- Increase Node.js heap limit: `node --max-old-space-size=8192`
- Use sampling profiler for large heaps

### GC Not Reducing Heap
- Ensure references are actually cleared
- Some objects are in old generation (need major GC)
- Check for global references: `Object.keys(globalThis)`
- V8 may delay GC; try multiple `collectGarbage` calls

### Inspector Connection Refused
- Verify runtime is running: `curl http://127.0.0.1:9229/json`
- Check port is correct (default 9229 for Node/Deno)
- Ensure `--inspect` flag is set
- Check firewall/network settings

### Snapshots Don't Show Leak
- Take 3+ snapshots to establish trend
- Force GC before each snapshot
- Ensure action actually leaks (test manually first)
- Check snapshot comparison view (not Summary)

## Best Practices

### Always Do This
- ✅ Force GC before snapshots: `collectGarbage`
- ✅ Use sampling in production (low overhead)
- ✅ Stream large snapshots (don't buffer)
- ✅ Take multiple snapshots for comparison
- ✅ Run in idle state (not mid-operation)

### Never Do This
- ❌ Take full snapshots in production
- ❌ Commit .heapsnapshot files (contain secrets/PII)
- ❌ Expose inspector port to public network
- ❌ Buffer entire snapshot in memory
- ❌ Compare snapshots without GC first

## Quick Tips

### Size Conversions
```typescript
const MB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2)
const KB = (bytes: number) => (bytes / 1024).toFixed(2)

console.log(`Heap: ${MB(usage.usedSize)}MB`)
```

### Alert on High Usage
```typescript
const percent = (usage.usedSize / usage.totalSize) * 100
if (percent > 90) {
  yield* Effect.logError("High heap usage!")
}
```

### Periodic Monitoring
```typescript
yield* Effect.repeat(
  Effect.flatMap(debug.memory.getHeapUsage, logUsage),
  Schedule.fixed(Duration.seconds(10))
)
```

### Save Snapshot with Timestamp
```typescript
const filename = `heap-${new Date().toISOString()}.heapsnapshot`
yield* Stream.run(snapshot, Sink.file(filename))
```

## Runtime-Specific Notes

### Node.js
- Use `--expose-gc` for `global.gc()` access
- Use `--max-old-space-size` to increase heap limit
- v8 module available in-process: `v8.getHeapSnapshot()`

### Chrome/Chromium
- Use `chrome://inspect` for GUI
- Performance tab shows GC timeline
- Can profile specific tabs/workers

### Deno
- Use `--v8-flags=--expose-gc` for GC access
- Permissions needed: `--allow-env --allow-read`

### Cloudflare Workers
- Local dev only (`wrangler dev`)
- 128MB limit (smaller than browsers)
- No production heap profiling

### Bun
- WebKit protocol (different from V8)
- Use `debug.bun.sh` for GUI
- Heap format differs from Chrome

## Resources

- **Research**: `.specs/debug/research-memory.md`
- **Task Spec**: `.specs/debug/tasks/task-006-memory-debugging.md`
- **CDP HeapProfiler**: https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/
- **Chrome Memory Profiling**: https://developer.chrome.com/docs/devtools/memory-problems/
- **MemLab**: https://facebook.github.io/memlab/