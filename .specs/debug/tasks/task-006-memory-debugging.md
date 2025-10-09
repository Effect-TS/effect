# Task 006: Memory Debugging and Profiling

**Status**: Not Started  
**Priority**: High  
**Depends On**: CDP implementation (Chrome/Chromium support), task-005 (Cloudflare Workers)  
**Research**: `.specs/debug/research-memory.md`

## Objective
Extend the `@effect-native/debug` service to support memory debugging capabilities including heap snapshots, allocation tracking, garbage collection monitoring, and memory leak detection across CDP-compatible runtimes. Enable Effect programs to programmatically capture, analyze, and stream memory profiling data for diagnosing leaks, optimizing allocations, and understanding runtime memory behavior.

## User Story
As a developer building Effect applications, I want to programmatically capture heap snapshots, track memory allocations, and monitor garbage collection through the `Debug` service so that I can detect memory leaks, optimize memory usage, and diagnose runtime memory issues without manually using Chrome DevTools or writing protocol-specific code.

## Requirements (EARS)

### Event-Driven
- [E1] When a heap snapshot is requested via `takeHeapSnapshot`, the system shall stream snapshot chunks as they arrive from the runtime without buffering the complete snapshot in memory.
- [E2] When allocation tracking is started via `startTrackingAllocations`, the system shall begin recording allocation events and make them available for subsequent queries.
- [E3] When garbage collection is triggered via `collectGarbage`, the system shall invoke the runtime's GC and return upon completion.

### State-Driven
- [S1] While capturing a heap snapshot, the system shall accumulate chunks in a Stream that consumers can pipe to files or process incrementally.
- [S2] While allocation tracking is active, the system shall maintain tracking state so that `stopTrackingAllocations` can retrieve the complete allocation timeline.
- [S3] When querying heap usage via `getHeapUsage`, the system shall return current heap statistics (used size, total size) in bytes.

### Memory-Aware
- [M1] When processing large heap snapshots (>1GB), the system shall not buffer the entire snapshot in memory but stream it directly to the consumer's sink (file, stream processor, etc.).
- [M2] When sampling heap profiler is active, the system shall use configurable sampling intervals to balance overhead vs. detail.
- [M3] When heap snapshots are captured, the system shall preserve V8 heap snapshot format (.heapsnapshot) for compatibility with Chrome DevTools and analysis tools.

### Optional
- [O1] When snapshot comparison is requested, the system shall provide utilities to diff two snapshots and identify object growth between them.
- [O2] When retainer path analysis is needed, the system shall parse snapshot data and compute paths from objects to GC roots.
- [O3] When automated leak detection is enabled, the system shall implement the three-snapshot technique to identify leaked objects.

## Acceptance Criteria

### AC-E1: Streaming Heap Snapshot Capture
```typescript
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as NodeFs from "@effect/platform-node/NodeFileSystem"

const captureSnapshot = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  const fs = yield* NodeFs.NodeFileSystem
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // Stream snapshot directly to file without buffering
  const snapshotStream = yield* debug.memory.takeHeapSnapshot
  
  yield* Stream.run(
    snapshotStream,
    Sink.fromWritableStream(() => fs.createWriteStream("heap.heapsnapshot"))
  )
  
  // Verify file exists and is valid JSON
  const content = yield* fs.readFileString("heap.heapsnapshot")
  const parsed = JSON.parse(content)
  
  assert(parsed.snapshot !== undefined)
  assert(parsed.nodes !== undefined)
  assert(parsed.snapshot.node_count > 0)
})
```

### AC-E2: Allocation Tracking Lifecycle
```typescript
const trackAllocations = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // Start tracking
  yield* debug.memory.startTrackingAllocations({ trackAllocations: true })
  
  // Perform allocation-heavy operations
  yield* debug.sendCommand({
    method: "Runtime.evaluate",
    params: { expression: "new Array(100000).fill({data: 'test'})" }
  })
  
  // Stop tracking and get results
  const timeline = yield* debug.memory.stopTrackingAllocations()
  
  // Timeline should contain allocation events
  assert(timeline !== undefined)
})
```

### AC-E3: Forced Garbage Collection
```typescript
const testGarbageCollection = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  
  // Allocate large object
  yield* debug.sendCommand({
    method: "Runtime.evaluate",
    params: { expression: "globalThis.tempLeak = new Array(1000000).fill(0)" }
  })
  
  const beforeGC = yield* debug.memory.getHeapUsage
  
  // Remove reference
  yield* debug.sendCommand({
    method: "Runtime.evaluate",
    params: { expression: "delete globalThis.tempLeak" }
  })
  
  // Force GC
  yield* debug.memory.collectGarbage
  
  const afterGC = yield* debug.memory.getHeapUsage
  
  // Heap should be smaller after GC
  assert(afterGC.usedSize < beforeGC.usedSize)
})
```

### AC-S1: Heap Usage Query
```typescript
const queryHeapUsage = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  
  const usage = yield* debug.memory.getHeapUsage
  
  assert(usage.usedSize > 0)
  assert(usage.totalSize > usage.usedSize)
  assert(usage.totalSize < 10_000_000_000) // Sanity check < 10GB
  
  // Log human-readable sizes
  const usedMB = (usage.usedSize / 1024 / 1024).toFixed(2)
  const totalMB = (usage.totalSize / 1024 / 1024).toFixed(2)
  console.log(`Heap: ${usedMB} MB / ${totalMB} MB`)
})
```

### AC-M1: Large Snapshot Streaming (No Buffering)
```typescript
const streamLargeSnapshot = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  const fs = yield* NodeFs.NodeFileSystem
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // Allocate large heap (>100MB)
  yield* debug.sendCommand({
    method: "Runtime.evaluate",
    params: { 
      expression: `
        globalThis.largeData = new Array(10).fill(null).map(() => 
          new Array(1000000).fill({ data: 'x'.repeat(100) })
        )
      `
    }
  })
  
  // Track memory usage during snapshot streaming
  const memBefore = process.memoryUsage().heapUsed
  
  const snapshotStream = yield* debug.memory.takeHeapSnapshot
  yield* Stream.run(
    snapshotStream,
    Sink.fromWritableStream(() => fs.createWriteStream("large.heapsnapshot"))
  )
  
  const memAfter = process.memoryUsage().heapUsed
  const increase = memAfter - memBefore
  
  // Memory increase should be small (not buffering full snapshot)
  // Allow 50MB overhead for stream processing
  assert(increase < 50_000_000, "Snapshot was buffered instead of streamed")
})
```

### AC-M2: Sampling Heap Profiler
```typescript
const sampleAllocations = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // Start sampling (sample every 32KB)
  yield* debug.memory.startSamplingHeapProfiler({ samplingInterval: 32768 })
  
  // Generate allocations
  yield* Effect.all([
    debug.sendCommand({
      method: "Runtime.evaluate",
      params: { expression: "new Array(100000).fill('data')" }
    }),
    debug.sendCommand({
      method: "Runtime.evaluate",
      params: { expression: "new Array(200000).fill('more')" }
    })
  ])
  
  // Stop and get profile
  const profile = yield* debug.memory.stopSamplingHeapProfiler
  
  assert(profile.head !== undefined)
  assert(profile.head.callFrame !== undefined)
  assert(profile.head.selfSize >= 0)
})
```

### AC-M3: Cross-Runtime Compatibility
```typescript
const testCrossRuntime = Effect.gen(function* () {
  const runtimes = [
    { name: "Node.js", endpoint: "http://127.0.0.1:9229" },
    { name: "Chrome", endpoint: "http://127.0.0.1:9222" },
    { name: "Deno", endpoint: "http://127.0.0.1:9229" },
    { name: "Workers", endpoint: "http://127.0.0.1:9229" }
  ]
  
  for (const runtime of runtimes) {
    yield* Effect.gen(function* () {
      const debug = yield* Debug.Debug
      
      yield* debug.connect({ endpoint: runtime.endpoint })
      yield* debug.sendCommand({ method: "HeapProfiler.enable" })
      
      // All runtimes should support getHeapUsage
      const usage = yield* debug.memory.getHeapUsage
      assert(usage.usedSize > 0, `${runtime.name} heap usage failed`)
      
      // All should support takeHeapSnapshot
      const snapshot = yield* debug.memory.takeHeapSnapshot
      const chunks = yield* Stream.runCollect(snapshot)
      assert(chunks.length > 0, `${runtime.name} snapshot failed`)
      
      yield* debug.disconnect()
    }).pipe(
      Effect.catchAll(() => 
        Console.log(`Skipping ${runtime.name} (not available)`)
      )
    )
  }
})
```

## Technical Specifications

### Memory Service Interface

```typescript
interface MemoryDebug {
  /**
   * Get current heap usage statistics.
   * 
   * @since 1.0.0
   * @category Memory
   * @example
   * ```typescript
   * const usage = yield* debug.memory.getHeapUsage
   * console.log(`Heap: ${usage.usedSize} / ${usage.totalSize} bytes`)
   * ```
   */
  readonly getHeapUsage: Effect.Effect<HeapUsage, DebugError>
  
  /**
   * Take a heap snapshot and stream it as chunks.
   * Returns a Stream that emits snapshot data incrementally.
   * 
   * @since 1.0.0
   * @category Memory
   * @example
   * ```typescript
   * const snapshot = yield* debug.memory.takeHeapSnapshot
   * yield* Stream.run(snapshot, Sink.file("heap.heapsnapshot"))
   * ```
   */
  readonly takeHeapSnapshot: Effect.Effect<Stream.Stream<string, DebugError>, DebugError>
  
  /**
   * Start tracking heap allocations.
   * 
   * @since 1.0.0
   * @category Memory
   */
  readonly startTrackingAllocations: (
    options?: { trackAllocations?: boolean }
  ) => Effect.Effect<void, DebugError>
  
  /**
   * Stop tracking allocations and return timeline.
   * 
   * @since 1.0.0
   * @category Memory
   */
  readonly stopTrackingAllocations: Effect.Effect<AllocationTimeline, DebugError>
  
  /**
   * Start sampling heap profiler with configurable interval.
   * 
   * @since 1.0.0
   * @category Memory
   * @example
   * ```typescript
   * yield* debug.memory.startSamplingHeapProfiler({ samplingInterval: 32768 })
   * // ... perform operations
   * const profile = yield* debug.memory.stopSamplingHeapProfiler
   * ```
   */
  readonly startSamplingHeapProfiler: (
    options?: { samplingInterval?: number }
  ) => Effect.Effect<void, DebugError>
  
  /**
   * Stop sampling profiler and return allocation profile.
   * 
   * @since 1.0.0
   * @category Memory
   */
  readonly stopSamplingHeapProfiler: Effect.Effect<SamplingHeapProfile, DebugError>
  
  /**
   * Force a garbage collection.
   * 
   * @since 1.0.0
   * @category Memory
   */
  readonly collectGarbage: Effect.Effect<void, DebugError>
}
```

### Schema Definitions

```typescript
import * as Schema from "@effect/schema/Schema"

export const HeapUsage = Schema.Struct({
  usedSize: Schema.Number,
  totalSize: Schema.Number
})

export const CallFrame = Schema.Struct({
  functionName: Schema.String,
  scriptId: Schema.String,
  url: Schema.String,
  lineNumber: Schema.Number,
  columnNumber: Schema.Number
})

export const SamplingHeapProfileNode = Schema.Struct({
  callFrame: CallFrame,
  selfSize: Schema.Number,
  id: Schema.Number,
  children: Schema.Array(Schema.suspend(() => SamplingHeapProfileNode))
})

export const SamplingHeapProfile = Schema.Struct({
  head: SamplingHeapProfileNode,
  samples: Schema.Array(Schema.Struct({
    size: Schema.Number,
    nodeId: Schema.Number,
    ordinal: Schema.Number
  }))
})

export const AllocationTimeline = Schema.Struct({
  // Format TBD based on protocol responses
  samples: Schema.Array(Schema.Any)
})
```

### Implementation Strategy

1. **HeapProfiler Domain Wrapper**: Create internal module that translates high-level memory operations to CDP HeapProfiler commands.

2. **Streaming Architecture**: Use `Stream.async` to emit snapshot chunks as `HeapProfiler.addHeapSnapshotChunk` events arrive.

3. **Event Subscription**: Subscribe to heap profiler events when operations start, unsubscribe when complete.

4. **Cross-Protocol Support**: Implement CDP version first, design interface for WebKit/Firefox equivalents.

5. **Error Handling**: Provide detailed errors for common issues (profiler not enabled, snapshot too large, runtime OOM).

## Out of Scope

### Not Included in Initial Implementation
- Heap snapshot parsing and analysis (retainer paths, dominators, object queries).
- Automated leak detection (three-snapshot comparison).
- Snapshot diff utilities.
- WebKit Inspector and Firefox RDP memory protocol implementations (CDP only initially).
- In-process memory tracking (focus on remote debugging protocols).
- Memory usage visualization or GUI tools.

### Future Work
- Snapshot comparison utilities for leak detection.
- Integration with @memlab/api for automated leak detection.
- Heap snapshot parser for programmatic analysis (retainer paths, etc.).
- Memory timeline visualization data export.
- Production-safe memory monitoring (metrics without snapshots).

## Testing Requirements

### Unit Tests
- Mock HeapProfiler events and validate streaming behavior.
- Test schema validation for HeapUsage, SamplingProfile, etc.
- Verify error handling when profiler is not enabled.
- Test event subscription/unsubscription lifecycle.

### Integration Tests

#### Heap Snapshot Streaming
```typescript
it.effect("streams heap snapshot without buffering", () =>
  Effect.gen(function* () {
    const debug = yield* Debug.Debug
    const fs = yield* NodeFs.NodeFileSystem
    
    yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
    yield* debug.sendCommand({ method: "HeapProfiler.enable" })
    
    const snapshot = yield* debug.memory.takeHeapSnapshot
    
    let chunkCount = 0
    yield* Stream.runForEach(snapshot, chunk => {
      chunkCount++
      return Effect.sync(() => {
        assert(typeof chunk === "string")
        assert(chunk.length > 0)
      })
    })
    
    assert(chunkCount > 0, "Should receive at least one chunk")
  })
)
```

#### Heap Usage Accuracy
```typescript
it.effect("reports accurate heap usage", () =>
  Effect.gen(function* () {
    const debug = yield* Debug.Debug
    
    yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
    
    const before = yield* debug.memory.getHeapUsage
    
    // Allocate known large object (~8MB)
    yield* debug.sendCommand({
      method: "Runtime.evaluate",
      params: { expression: "globalThis.test = new Array(1000000).fill(0)" }
    })
    
    const after = yield* debug.memory.getHeapUsage
    
    // Should see increase (at least 4MB accounting for overhead)
    const increase = after.usedSize - before.usedSize
    assert(increase > 4_000_000, `Expected >4MB increase, got ${increase}`)
  })
)
```

#### Garbage Collection Effectiveness
```typescript
it.effect("reduces heap after forced GC", () =>
  Effect.gen(function* () {
    const debug = yield* Debug.Debug
    
    yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
    
    // Allocate and release
    yield* debug.sendCommand({
      method: "Runtime.evaluate",
      params: { expression: "globalThis.tmp = new Array(1000000).fill(0)" }
    })
    
    const beforeGC = yield* debug.memory.getHeapUsage
    
    yield* debug.sendCommand({
      method: "Runtime.evaluate",
      params: { expression: "delete globalThis.tmp" }
    })
    
    yield* debug.memory.collectGarbage
    
    const afterGC = yield* debug.memory.getHeapUsage
    
    assert(afterGC.usedSize < beforeGC.usedSize)
  })
)
```

#### Sampling Profiler
```typescript
it.effect("captures allocation samples", () =>
  Effect.gen(function* () {
    const debug = yield* Debug.Debug
    
    yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
    yield* debug.sendCommand({ method: "HeapProfiler.enable" })
    
    yield* debug.memory.startSamplingHeapProfiler({ samplingInterval: 16384 })
    
    // Generate allocations
    yield* debug.sendCommand({
      method: "Runtime.evaluate",
      params: { expression: "new Array(500000).fill('sample')" }
    })
    
    const profile = yield* debug.memory.stopSamplingHeapProfiler
    
    assert(profile.head !== undefined)
    assert(profile.samples.length > 0)
  })
)
```

### CI Requirements
- Test against Node.js with `--expose-gc` flag for reliable GC testing.
- Use Chrome/Chromium with `--remote-debugging-port` for browser tests.
- Optional: Test against Deno and wrangler dev if available.
- Hard-fail if inspector endpoints are unreachable.
- Set adequate test timeouts (heap snapshots can take 5-10 seconds for large heaps).

## Success Metrics

- [SM-E1] Heap snapshot streaming test passes with >100MB snapshot without OOM (validates AC-M1).
- [SM-E2] All integration tests pass on Node.js, Chrome, and at least one other runtime (validates AC-M3).
- [SM-S1] Heap usage reports match in-process v8.getHeapStatistics() within 10% margin (validates AC-S1).
- [SM-M1] Sampling profiler captures allocation call stacks with recognizable function names (validates AC-M2).
- [SM-DOC] Documentation includes complete examples for leak detection workflow using captured snapshots.

## Documentation Requirements

### API Documentation
- Document all MemoryDebug interface methods with JSDoc.
- Provide `@example` tags showing common use cases (snapshot capture, leak detection, heap monitoring).
- Include `@since` tags for all public APIs.
- Document schema shapes for HeapUsage, SamplingProfile, etc.

### User Guides
- **Memory Leak Detection Guide**: Step-by-step tutorial using three-snapshot technique.
- **Heap Snapshot Analysis**: How to capture and analyze snapshots in Chrome DevTools.
- **Production Monitoring**: Safe memory monitoring techniques (sampling, heap usage polling).
- **Cross-Runtime Support**: Which features work on which runtimes.

### Examples
- Simple heap usage monitoring script.
- Automated leak detection with snapshot comparison.
- Memory profiling CI/CD integration (fail builds on growing heap).
- Real-time heap monitoring dashboard (Stream heap usage to metrics).

## Future Considerations

### Advanced Analysis
- Heap snapshot parser for programmatic queries (find objects by class, compute retainer paths).
- Dominator tree computation for identifying memory ownership.
- Snapshot diff algorithm for automated leak detection.
- Object allocation tracking with stack traces.

### Cross-Protocol Support
- WebKit Inspector Heap domain implementation.
- Firefox RDP memory actor integration.
- React Native Hermes memory profiling.

### Production Features
- Safe production memory monitoring (no snapshots, only metrics).
- Memory pressure detection and alerting.
- Automatic leak detection in long-running services.
- Integration with observability platforms (Prometheus, Datadog).

### Tool Integration
- @memlab/api integration for automated leak detection.
- heapsnapshot-parser integration for snapshot analysis.
- Chrome DevTools protocol trace events for timeline profiling.

## References

### Research
- Memory debugging research: `.specs/debug/research-memory.md`
- Protocol documentation: `https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/`

### Protocol Specifications
- CDP HeapProfiler: `https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/`
- CDP Runtime: `https://chromedevtools.github.io/devtools-protocol/tot/Runtime/`
- WebKit Heap: `https://github.com/WebKit/WebKit/blob/main/Source/JavaScriptCore/inspector/protocol/Heap.json`
- Node.js v8 module: `https://nodejs.org/api/v8.html`

### Tools and Libraries
- Chrome DevTools Memory Profiling: `https://developer.chrome.com/docs/devtools/memory-problems/`
- MemLab: `https://facebook.github.io/memlab/`
- V8 Heap Snapshot Format: `https://github.com/v8/v8/blob/main/src/profiler/heap-snapshot-generator.h`
