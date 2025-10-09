# Memory Debugging Summary

## Overview

The debug spec has been extended with comprehensive memory debugging and profiling capabilities. This enables Effect programs to programmatically capture heap snapshots, track memory allocations, monitor garbage collection, and detect memory leaks across JavaScript runtimes using their native inspector protocols.

## What Was Added

### Research Documentation
- **`.specs/debug/research-memory.md`** (787 lines): Comprehensive research covering:
  - Heap snapshot format (V8 .heapsnapshot JSON structure)
  - Allocation tracking techniques (full tracking vs. sampling)
  - Garbage collection monitoring and metrics
  - Memory leak detection strategies (three-snapshot technique, retainer paths)
  - Protocol-specific APIs (CDP HeapProfiler, WebKit Heap, Firefox RDP memory actor)
  - Paste-and-run examples for all major runtimes
  - Cross-runtime considerations and compatibility matrix
  - Security implications and best practices

### Task Specification
- **`.specs/debug/tasks/task-006-memory-debugging.md`** (596 lines): Implementation task covering:
  - EARS requirements (Event-Driven, State-Driven, Memory-Aware, Optional)
  - Detailed acceptance criteria with Effect code examples
  - Service interface design with JSDoc
  - Schema definitions for HeapUsage, SamplingProfile, AllocationTimeline
  - Streaming architecture for large heap snapshots (no buffering)
  - Integration test specifications
  - Success metrics and documentation requirements

### Updated Core Specifications
- **`.specs/debug/instructions.md`**: Added memory debugging requirements
  - New EARS requirements for Memory-Aware and Stream-Based capabilities
  - Acceptance criteria for heap snapshots, allocation tracking, GC monitoring
  - Testing requirements for snapshot streaming and cross-runtime compatibility
  
- **`.specs/debug/research.md`**: Added memory debugging to mastery map
  - Workflow guidance (heap usage → sampling → full snapshots → leak analysis)
  - Reference to detailed memory research document

## Key Capabilities

### 1. Heap Snapshots
- **Capture**: Point-in-time snapshot of all objects in heap with sizes and references
- **Streaming**: Large snapshots (>1GB) stream incrementally without buffering in memory
- **Format**: V8 .heapsnapshot JSON compatible with Chrome DevTools
- **Use Cases**: Memory leak detection, object retention analysis, identifying large objects

```typescript
const snapshot = yield* debug.memory.takeHeapSnapshot
yield* Stream.run(snapshot, Sink.file("heap.heapsnapshot"))
```

### 2. Heap Usage Monitoring
- **Real-Time**: Query current heap usage (used/total bytes)
- **Lightweight**: Minimal overhead, suitable for production monitoring
- **Cross-Runtime**: Works on all CDP-compatible runtimes

```typescript
const usage = yield* debug.memory.getHeapUsage
console.log(`Heap: ${usage.usedSize} / ${usage.totalSize} bytes`)
```

### 3. Allocation Tracking
- **Full Tracking**: Record every allocation with stack traces
- **Sampling**: Statistical sampling (lower overhead, production-safe)
- **Timeline**: Visualize allocation patterns over time

```typescript
yield* debug.memory.startSamplingHeapProfiler({ samplingInterval: 32768 })
// ... perform operations
const profile = yield* debug.memory.stopSamplingHeapProfiler
```

### 4. Garbage Collection Control
- **Force GC**: Trigger garbage collection for testing/benchmarking
- **Metrics**: Observe GC pause times and heap statistics
- **Verification**: Confirm memory is released after cleanup

```typescript
yield* debug.memory.collectGarbage
```

### 5. Memory Leak Detection
- **Three-Snapshot Technique**: Baseline → Action → Repeat → Compare
- **Retainer Paths**: Trace what's keeping objects alive
- **Automated Analysis**: Tools integration (@memlab/api)

## Cross-Runtime Support

| Runtime | Heap Snapshot | Heap Usage | Sampling | Allocation Tracking | GC Control |
|---------|---------------|------------|----------|---------------------|------------|
| **Chrome/Chromium** | ✅ CDP | ✅ CDP | ✅ CDP | ✅ CDP | ✅ CDP |
| **Node.js** | ✅ CDP + v8 | ✅ CDP + v8 | ✅ CDP | ✅ CDP | ✅ CDP + --expose-gc |
| **Deno** | ✅ CDP | ✅ CDP | ✅ CDP | ✅ CDP | ✅ CDP + V8 flags |
| **Cloudflare Workers** | ✅ CDP (local) | ✅ CDP (local) | ✅ CDP (local) | ✅ CDP (local) | ✅ CDP (local) |
| **Bun** | ✅ WebKit | ✅ WebKit | ✅ WebKit | ⚠️ Limited | ✅ WebKit |
| **Safari/iOS** | ✅ WebKit | ✅ WebKit | ✅ WebKit | ⚠️ Limited | ✅ WebKit |
| **Firefox** | ✅ RDP | ✅ RDP | ⚠️ Limited | ⚠️ Limited | ✅ RDP |

**Note**: ✅ = Full support, ⚠️ = Partial/limited support, ❌ = Not supported

## Memory Service Interface

```typescript
interface MemoryDebug {
  // Get current heap usage statistics
  readonly getHeapUsage: Effect.Effect<HeapUsage, DebugError>
  
  // Take heap snapshot (streaming)
  readonly takeHeapSnapshot: Effect.Effect<Stream.Stream<string, DebugError>, DebugError>
  
  // Allocation tracking
  readonly startTrackingAllocations: (options?: { trackAllocations?: boolean }) => Effect.Effect<void, DebugError>
  readonly stopTrackingAllocations: Effect.Effect<AllocationTimeline, DebugError>
  
  // Sampling heap profiler
  readonly startSamplingHeapProfiler: (options?: { samplingInterval?: number }) => Effect.Effect<void, DebugError>
  readonly stopSamplingHeapProfiler: Effect.Effect<SamplingHeapProfile, DebugError>
  
  // Garbage collection
  readonly collectGarbage: Effect.Effect<void, DebugError>
}
```

## Usage Examples

### Memory Leak Detection (Three-Snapshot Technique)

```typescript
import * as Effect from "effect/Effect"
import * as Debug from "@effect-native/debug"

const detectLeak = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // 1. Baseline snapshot
  yield* saveSnapshot(debug, "baseline.heapsnapshot")
  
  // 2. Perform suspected leak action
  yield* performSuspectedAction()
  yield* saveSnapshot(debug, "snapshot2.heapsnapshot")
  
  // 3. Repeat action (leaks will grow, one-time allocations won't)
  yield* performSuspectedAction()
  yield* saveSnapshot(debug, "snapshot3.heapsnapshot")
  
  // Compare in Chrome DevTools to find leaked objects
  console.log("Compare snapshot3 with snapshot2 to find growing objects")
})

const saveSnapshot = (debug: Debug, filename: string) =>
  Effect.gen(function* () {
    const snapshot = yield* debug.memory.takeHeapSnapshot
    yield* Stream.run(snapshot, Sink.file(filename))
  })
```

### Real-Time Heap Monitoring

```typescript
const monitorHeap = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  
  yield* Effect.repeat(
    Effect.gen(function* () {
      const usage = yield* debug.memory.getHeapUsage
      const usedMB = (usage.usedSize / 1024 / 1024).toFixed(2)
      const totalMB = (usage.totalSize / 1024 / 1024).toFixed(2)
      const percent = ((usage.usedSize / usage.totalSize) * 100).toFixed(1)
      
      console.log(`Heap: ${usedMB}MB / ${totalMB}MB (${percent}%)`)
      
      // Alert if heap usage is high
      if (usage.usedSize / usage.totalSize > 0.9) {
        yield* Effect.logWarning("High heap usage detected!")
      }
    }),
    Schedule.fixed(Duration.seconds(5))
  )
})
```

### Production-Safe Sampling Profiler

```typescript
const profileProduction = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // Low-overhead sampling (every 64KB)
  yield* debug.memory.startSamplingHeapProfiler({ samplingInterval: 65536 })
  
  // Run for 60 seconds
  yield* Effect.sleep(Duration.seconds(60))
  
  // Get allocation profile
  const profile = yield* debug.memory.stopSamplingHeapProfiler
  
  // Analyze top allocators
  analyzeProfile(profile)
})
```

## Common Memory Leak Patterns

### 1. Event Listeners (Browsers)
```typescript
// Leak: DOM node with event listener
element.addEventListener('click', () => { /* uses closure */ })
// Later: remove element from DOM but listener keeps it alive
```

### 2. Closures Capturing Large Scopes
```typescript
// Leak: Inner function captures entire outer scope
function outer() {
  const largeData = new Array(1000000).fill(0)
  return () => largeData[0]  // Keeps entire array alive
}
```

### 3. Global References
```typescript
// Leak: Accidental global
function addUser(user) {
  users = users || []  // Missing 'var/let/const' creates global
  users.push(user)
}
```

### 4. Effect-Specific: Long-Running Fibers
```typescript
// Leak: Fiber that never completes
Effect.forever(
  Effect.gen(function* () {
    const data = yield* fetchData()
    cache.set(data)  // Cache grows unbounded
  })
)
```

## Testing Considerations

### Integration Test Requirements
1. **Hard-fail if inspector unavailable**: Tests must fail loudly if runtime not running
2. **Large snapshot handling**: Test with >100MB snapshots to verify streaming
3. **Cross-runtime validation**: Test on Node.js, Chrome, Deno at minimum
4. **GC verification**: Ensure heap reduces after forced GC
5. **Adequate timeouts**: Heap snapshots can take 5-10 seconds

### Example Test
```typescript
it.effect("streams large snapshot without buffering", () =>
  Effect.gen(function* () {
    const debug = yield* Debug.Debug
    
    yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
    yield* debug.sendCommand({ method: "HeapProfiler.enable" })
    
    // Allocate large heap
    yield* debug.sendCommand({
      method: "Runtime.evaluate",
      params: { expression: "globalThis.large = new Array(10000000).fill(0)" }
    })
    
    const memBefore = process.memoryUsage().heapUsed
    
    const snapshot = yield* debug.memory.takeHeapSnapshot
    yield* Stream.run(snapshot, Sink.file("large.heapsnapshot"))
    
    const memAfter = process.memoryUsage().heapUsed
    const increase = memAfter - memBefore
    
    // Should not buffer entire snapshot
    expect(increase).toBeLessThan(50_000_000)
  })
)
```

## Security Considerations

### Snapshot Contents
- **Secrets**: Heap snapshots contain ALL in-memory data (passwords, tokens, API keys)
- **PII**: User data visible in snapshots (emails, names, addresses)
- **Mitigation**: Encrypt snapshots, sanitize before sharing, never commit to version control

### Inspector Access
- **Bind localhost only**: Never expose inspector ports to public networks
- **Production**: Disable heap profiling in production (use sampling only if needed)
- **SSH tunneling**: For remote debugging: `ssh -L 9229:127.0.0.1:9229 user@host`

## Tools and Analysis

### Chrome DevTools
- Load .heapsnapshot files in Memory tab
- Compare snapshots to find object growth
- Analyze retainer paths to find leak causes
- View allocation timeline

### MemLab (@memlab/api)
- Meta's automated leak detection framework
- Scenario-based testing (action → cleanup → verify)
- Automatic retainer path analysis

### heapsnapshot-parser
- Node.js library for programmatic snapshot analysis
- Query objects by class name
- Compute retainer paths
- Find detached DOM nodes

## Next Steps

### Implementation (Task 006)
1. Implement `MemoryDebug` service interface
2. Add HeapProfiler event subscription
3. Implement snapshot streaming with `Stream.async`
4. Create schemas for HeapUsage, SamplingProfile
5. Write integration tests for all runtimes
6. Document memory debugging workflows

### Future Enhancements
- Snapshot comparison utilities (automated leak detection)
- Retainer path computation (parse snapshot, build graph)
- Integration with @memlab/api
- Production-safe memory metrics (no snapshots)
- Memory pressure alerting

## References

### Documentation
- **Research**: `.specs/debug/research-memory.md` (detailed protocol docs, examples)
- **Task**: `.specs/debug/tasks/task-006-memory-debugging.md` (implementation spec)
- **Instructions**: `.specs/debug/instructions.md` (updated requirements)

### Protocol Specs
- CDP HeapProfiler: https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/
- WebKit Heap: https://github.com/WebKit/WebKit/blob/main/Source/JavaScriptCore/inspector/protocol/Heap.json
- Node.js v8: https://nodejs.org/api/v8.html

### Tools
- Chrome DevTools Memory: https://developer.chrome.com/docs/devtools/memory-problems/
- MemLab: https://facebook.github.io/memlab/
- V8 Heap Format: https://github.com/v8/v8/blob/main/src/profiler/heap-snapshot-generator.h

---

**Status**: Specification complete, ready for implementation (Task 006)