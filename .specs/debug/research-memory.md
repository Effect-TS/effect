# Memory Debugging Research

## Summary
Modern JavaScript runtimes expose memory debugging capabilities through their inspector protocols, enabling heap snapshots, allocation tracking, garbage collection monitoring, and leak detection. CDP-based runtimes (Chrome, Node.js, Deno, Workers) provide the most comprehensive tooling via `HeapProfiler` and `Profiler` domains, while WebKit and Firefox offer equivalent features through their respective protocols. Memory debugging is essential for identifying leaks, optimizing allocations, and understanding runtime memory behavior in Effect applications.

## Capability Overview

### Heap Snapshots
- **What**: Point-in-time capture of all objects in the heap with their sizes, references, and retention paths.
- **Protocols**: CDP (`HeapProfiler.takeHeapSnapshot`), WebKit Inspector (`Heap.snapshot`), Firefox RDP (`memory` actor).
- **Use Cases**: Memory leak detection, object retention analysis, identifying unexpectedly large objects.
- **Format**: Typically JSON with nodes array (objects) and edges array (references between objects).

### Allocation Tracking
- **What**: Record every allocation with stack traces to identify where objects are created.
- **Protocols**: CDP (`HeapProfiler.startTrackingHeapObjects`, `HeapProfiler.stopTrackingHeapObjects`), WebKit sampling allocations.
- **Use Cases**: Finding allocation hot spots, tracking memory growth over time, identifying temporary object churn.
- **Output**: Timeline of allocations with sizes and call stacks.

### Sampling Heap Profiler
- **What**: Statistical sampling of allocations (lower overhead than full tracking).
- **Protocols**: CDP (`HeapProfiler.startSampling`, `HeapProfiler.stopSampling`), WebKit Inspector.
- **Use Cases**: Production-safe profiling, identifying major allocation sources without full tracking overhead.
- **Sampling Rate**: Configurable (e.g., sample every 32KB of allocations).

### Garbage Collection Monitoring
- **What**: Observe GC events, pause times, and heap statistics.
- **Protocols**: CDP (`HeapProfiler.collectGarbage`, `Runtime.getHeapUsage`), WebKit Inspector, Node.js `v8` module.
- **Use Cases**: Understanding GC pressure, optimizing allocation patterns, detecting GC thrashing.
- **Metrics**: Heap size, used heap, GC pause duration, GC type (scavenge vs. mark-compact).

### Memory Leak Detection
- **What**: Compare snapshots over time to find growing retainer sets.
- **Techniques**: 
  - Three-snapshot technique (baseline → action → repeat → compare)
  - Detached DOM nodes (browsers)
  - Retainer path analysis
  - Object allocation timeline
- **Tools**: Chrome DevTools Memory tab, `@memlab/api`, custom snapshot diffing.

## Protocol-Specific Details

### Chrome DevTools Protocol (CDP)

#### HeapProfiler Domain
- **`HeapProfiler.takeHeapSnapshot`**: Captures full heap snapshot, streams as `HeapProfiler.addHeapSnapshotChunk` events.
- **`HeapProfiler.startTrackingHeapObjects`**: Begin recording allocations with optional `trackAllocations` flag.
- **`HeapProfiler.stopTrackingHeapObjects`**: Stop tracking, optionally report statistics.
- **`HeapProfiler.getHeapObjectId`**: Get heap object ID for a remote object reference.
- **`HeapProfiler.startSampling`**: Start sampling heap profiler (low overhead).
- **`HeapProfiler.stopSampling`**: Stop and return sampling profile.
- **`HeapProfiler.collectGarbage`**: Force a garbage collection.

#### Runtime Domain (Memory-Related)
- **`Runtime.getHeapUsage`**: Returns `usedSize` and `totalSize` in bytes.
- **`Runtime.evaluate`**: Can check `performance.memory` in browsers (non-standard but widely available).

#### Memory Domain (Experimental in some Chrome versions)
- **`Memory.getDOMCounters`**: Browser-specific, returns document/node/listener counts.
- **`Memory.prepareForLeakDetection`**: Runs GC and clears caches before leak detection.
- **`Memory.startSampling`**: Similar to HeapProfiler sampling.

### WebKit Inspector Protocol

#### Heap Domain
- **`Heap.enable`**: Enable heap tracking.
- **`Heap.disable`**: Disable heap tracking.
- **`Heap.gc`**: Trigger garbage collection.
- **`Heap.snapshot`**: Take a heap snapshot (event-based streaming).
- **`Heap.startTracking`**: Begin allocation tracking.
- **`Heap.stopTracking`**: Stop tracking and get timeline.
- **`Heap.getPreview`**: Get object preview by heap object ID.

#### Events
- **`Heap.garbageCollected`**: Fired after GC with collection type and duration.
- **`Heap.trackingStart`**: Tracking has started.
- **`Heap.trackingComplete`**: Tracking completed with snapshot data.

### Firefox Remote Debug Protocol (RDP)

#### Memory Actor
- **`attach`**: Attach to memory actor for a target.
- **`detach`**: Detach from memory actor.
- **`measure`**: Get current memory measurements (compartments, GC stats).
- **`startRecordingAllocations`**: Begin allocation log recording.
- **`stopRecordingAllocations`**: Stop and retrieve allocations.
- **`getAllocations`**: Get recorded allocations since last call.
- **`forceGarbageCollection`**: Trigger GC.
- **`forceCycleCollection`**: Trigger cycle collection (Firefox-specific).
- **`saveHeapSnapshot`**: Save heap snapshot to disk, returns file path.

### Node.js V8 Module (In-Process)
While not a remote protocol, Node.js provides the `v8` module for in-process memory inspection:

```javascript
const v8 = require('v8');

// Heap statistics
const heapStats = v8.getHeapStatistics();
// { total_heap_size, used_heap_size, heap_size_limit, ... }

// Heap spaces
const heapSpaces = v8.getHeapSpaceStatistics();
// [{ space_name, space_size, space_used_size, ... }, ...]

// Heap snapshot to stream
const stream = v8.getHeapSnapshot();
stream.pipe(fs.createWriteStream('heap.heapsnapshot'));

// Code statistics
const codeStats = v8.getHeapCodeStatistics();
```

## Heap Snapshot Format

### V8 Heap Snapshot (.heapsnapshot)
Used by Chrome, Node.js, Deno, Cloudflare Workers:

```json
{
  "snapshot": {
    "meta": {
      "node_fields": ["type", "name", "id", "self_size", "edge_count", "trace_node_id"],
      "node_types": [["hidden", "array", "string", "object", "code", ...]],
      "edge_fields": ["type", "name_or_index", "to_node"],
      "edge_types": [["context", "element", "property", "internal", ...]]
    },
    "node_count": 123456,
    "edge_count": 654321
  },
  "nodes": [0, 1, 2, 3, 4, 0, ...],  // Flat array: [type, name_id, id, size, edge_count, trace_id, ...]
  "edges": [0, 1, 6, ...],            // Flat array: [type, name_or_index, to_node_index, ...]
  "strings": ["", "Window", "document", "Array", ...]
}
```

### Analysis Techniques
1. **Retainer Paths**: Walk edges backwards from object to GC roots to find what's keeping it alive.
2. **Dominators**: Identify objects that, if freed, would free other objects (dominator tree).
3. **Shallow vs. Retained Size**: Shallow = object's own size; Retained = size of objects kept alive by this object.
4. **Detached Trees**: Objects disconnected from roots but still retained (common leak pattern).

## Paste-and-Run Examples

### Chrome/Chromium: Take Heap Snapshot

```bash
# Start Chrome with remote debugging
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-profile \
  about:blank >/dev/null 2>&1 & 
sleep 2

# Get WebSocket URL
WS=$(curl -s http://127.0.0.1:9222/json | jq -r '.[0].webSocketDebuggerUrl')

# Enable HeapProfiler and take snapshot (streams to events)
npx -y wscat -c "$WS" << 'EOF'
{"id":1,"method":"HeapProfiler.enable"}
{"id":2,"method":"HeapProfiler.takeHeapSnapshot","params":{"reportProgress":false}}
EOF

# Snapshot data arrives as HeapProfiler.addHeapSnapshotChunk events
# Concatenate all chunks to build complete .heapsnapshot file
```

### Node.js: Heap Snapshot via CDP

```bash
# Start Node.js with inspector
node --inspect=9229 -e "setTimeout(() => {}, 1e9)" &
sleep 1

WS=$(curl -s http://127.0.0.1:9229/json/list | jq -r '.[0].webSocketDebuggerUrl')

# Take snapshot via CDP
npx -y wscat -c "$WS" -x '{"id":1,"method":"HeapProfiler.enable"}'
npx -y wscat -c "$WS" -x '{"id":2,"method":"HeapProfiler.takeHeapSnapshot"}'

# Or use Node.js v8 module directly (in-process)
node -e "
const v8 = require('v8');
const fs = require('fs');
const snapshot = v8.getHeapSnapshot();
snapshot.pipe(fs.createWriteStream('heap.heapsnapshot'));
console.log('Snapshot saved to heap.heapsnapshot');
"
```

### Deno: Heap Statistics

```bash
# Start Deno with inspector
deno eval --inspect "setTimeout(() => {}, 1e9)" &
sleep 1

WS=$(curl -s http://127.0.0.1:9229/json/list | jq -r '.[0].webSocketDebuggerUrl')

# Get heap usage
npx -y wscat -c "$WS" -x '{"id":1,"method":"Runtime.getHeapUsage"}'
# Returns: {"id":1,"result":{"usedSize":1234567,"totalSize":2345678}}

# Take snapshot
npx -y wscat -c "$WS" << 'EOF'
{"id":2,"method":"HeapProfiler.enable"}
{"id":3,"method":"HeapProfiler.takeHeapSnapshot"}
EOF
```

### Cloudflare Workers: Sampling Heap Profiler

```bash
# Start wrangler dev with inspector
cd my-worker
npx wrangler dev --inspector-port=9229 &
sleep 3

WS=$(curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl')

# Start sampling profiler
npx -y wscat -c "$WS" << 'EOF'
{"id":1,"method":"HeapProfiler.enable"}
{"id":2,"method":"HeapProfiler.startSampling","params":{"samplingInterval":32768}}
EOF

# Generate load (trigger fetch requests)
curl http://localhost:8787/  # Repeat several times

# Stop sampling and get profile
npx -y wscat -c "$WS" -x '{"id":3,"method":"HeapProfiler.stopSampling"}'
# Returns allocation profile with call stacks
```

### Safari/Bun: WebKit Heap Snapshot

```bash
# For Safari: Enable Develop menu, start target, use Safari Web Inspector UI
# For Bun: Start with inspector

bun --inspect=9223 -e "setTimeout(() => {}, 1e9)" &
sleep 1

# Bun prints debug.bun.sh URL; extract WebSocket
WS="ws://localhost:9223/..."  # Extract from Bun output

npx -y wscat -c "$WS" << 'EOF'
{"id":1,"method":"Heap.enable"}
{"id":2,"method":"Heap.gc"}
{"id":3,"method":"Heap.snapshot"}
EOF

# Snapshot streams as Heap.snapshot events with chunk data
```

### Firefox: Memory Actor via RDP

```python
#!/usr/bin/env python3
import socket
import json

def send_rdp(sock, data):
    msg = json.dumps(data).encode('utf-8')
    sock.sendall(f"{len(msg)}:".encode('utf-8') + msg)

def recv_rdp(sock):
    length = b""
    while True:
        char = sock.recv(1)
        if char == b":":
            break
        length += char
    size = int(length.decode('utf-8'))
    return json.loads(sock.recv(size).decode('utf-8'))

# Connect to Firefox remote debugging (default port 6000)
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('127.0.0.1', 6000))

# List tabs
send_rdp(sock, {"to": "root", "type": "listTabs"})
tabs = recv_rdp(sock)
tab_actor = tabs['tabs'][0]['actor']

# Get memory actor
send_rdp(sock, {"to": tab_actor, "type": "attach"})
recv_rdp(sock)  # Attach response

# Assume memory actor from capabilities (or query it)
# Firefox structure varies; typically need to request memory actor

# Force GC
send_rdp(sock, {"to": tab_actor, "type": "memory", "action": "forceGarbageCollection"})
print(recv_rdp(sock))

# Get memory measurements
send_rdp(sock, {"to": tab_actor, "type": "memory", "action": "measure"})
print(recv_rdp(sock))

sock.close()
```

**Note**: Firefox RDP memory actor API varies by version; consult `https://firefox-source-docs.mozilla.org/devtools/backend/protocol.html` for current actor structure.

### Programmatic Snapshot Analysis (Node.js)

```javascript
import CDP from 'chrome-remote-interface';
import fs from 'fs';

// Connect to Node.js inspector
const client = await CDP({ port: 9229 });
const { HeapProfiler, Runtime } = client;

await HeapProfiler.enable();

// Take snapshot
const chunks = [];
HeapProfiler.addHeapSnapshotChunk(({ chunk }) => {
  chunks.push(chunk);
});

await HeapProfiler.takeHeapSnapshot();

// Save snapshot
const snapshot = chunks.join('');
fs.writeFileSync('heap.heapsnapshot', snapshot);
console.log('Snapshot saved:', snapshot.length, 'bytes');

// Parse and analyze
const data = JSON.parse(snapshot);
console.log('Node count:', data.snapshot.node_count);
console.log('Edge count:', data.snapshot.edge_count);

// Get current heap usage
const { usedSize, totalSize } = await Runtime.getHeapUsage();
console.log(`Heap: ${(usedSize / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

await client.close();
```

## Memory Leak Detection Techniques

### Three-Snapshot Technique
1. **Baseline**: Take snapshot before suspected leak action.
2. **Action**: Perform the action that may leak (e.g., open/close modal 10 times).
3. **Repeat**: Perform action again.
4. **Compare**: Objects that grew between snapshots 2 and 3 but not in 1 are likely leaks.

```javascript
// Pseudocode for three-snapshot leak detection
const snapshot1 = await takeHeapSnapshot();  // Baseline
await performAction();                        // First action
const snapshot2 = await takeHeapSnapshot();  // After first action
await performAction();                        // Repeat action
const snapshot3 = await takeHeapSnapshot();  // After repeat

// Analyze: Objects in snapshot3 that weren't in snapshot1
// but are similar to objects added in snapshot2 → likely leaks
const leaked = findObjectsGrowingBetween(snapshot2, snapshot3);
```

### Allocation Timeline
1. **Start Tracking**: `HeapProfiler.startTrackingHeapObjects({"trackAllocations": true})`.
2. **Perform Actions**: Execute code that may allocate.
3. **Stop Tracking**: `HeapProfiler.stopTrackingHeapObjects({"reportProgress": true})`.
4. **Analyze Timeline**: Look for allocations that never get freed.

### Retainer Path Analysis
For each leaked object, walk the retainer chain to find the root:
```
Object → retainedBy → parentObject → retainedBy → EventListener → retainedBy → Window (root)
```

Common leak patterns:
- **Forgotten Event Listeners**: DOM nodes retained by event listeners.
- **Closures**: Functions capturing large scopes.
- **Global References**: Accidental globals or module-level caches.
- **Detached DOM**: DOM nodes removed from document but still referenced.

### Snapshot Comparison Tools
- **Chrome DevTools**: Load multiple snapshots, use "Comparison" view.
- **@memlab/api**: Automated leak detection framework by Meta.
- **heapsnapshot-parser**: Node.js library for parsing .heapsnapshot files.

## Runtime-Specific Considerations

### Node.js
- **`--max-old-space-size`**: Set heap limit (default ~2GB on 64-bit).
- **`--expose-gc`**: Expose `global.gc()` for manual GC triggers.
- **`--heap-prof`**: Generate heap profile on exit.
- **`--heapsnapshot-signal`**: Take snapshot on signal (e.g., SIGUSR2).
- **Native Addons**: C++ memory not visible in heap snapshots.

### Deno
- **V8 Flags**: Use `--v8-flags=--expose-gc` for manual GC.
- **Permissions**: Heap snapshots require `--allow-env` and `--allow-read` for file access.
- **Worker Isolation**: Each worker has separate heap; snapshot per worker.

### Cloudflare Workers
- **Local Dev Only**: Heap profiling available in `wrangler dev`, not production.
- **Memory Limits**: 128MB limit enforced; heap snapshots show isolate usage.
- **Ephemeral Isolates**: Worker isolate recycled after requests; snapshots are per-session.
- **No Persistent State**: Heap resets between invocations in production.

### Browsers
- **Detached DOM Nodes**: Common leak source; nodes removed from DOM but still referenced.
- **Service Workers**: Separate heap; profile via `chrome://inspect`.
- **SharedArrayBuffer**: Shared memory not tracked in heap snapshots.
- **Web Workers**: Each worker has isolated heap; profile separately.

### Bun (JavaScriptCore)
- **JSC Heap**: Different GC algorithm than V8 (generational, incremental).
- **WebKit Inspector**: Heap snapshots via WebKit protocol, different format than V8.
- **Native Modules**: FFI allocations not tracked in heap snapshots.

## Integration with @effect-native/debug

### Memory Profiling Service Design

```typescript
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as Schema from "@effect/schema/Schema"

// Memory snapshot chunk schema
const HeapSnapshotChunk = Schema.Struct({
  chunk: Schema.String
})

// Heap usage schema
const HeapUsage = Schema.Struct({
  usedSize: Schema.Number,
  totalSize: Schema.Number
})

// Sampling profile schema
const SamplingProfile = Schema.Struct({
  head: Schema.Struct({
    callFrame: Schema.Struct({
      functionName: Schema.String,
      url: Schema.String,
      lineNumber: Schema.Number
    }),
    children: Schema.Array(Schema.Any),
    selfSize: Schema.Number
  })
})

interface MemoryDebug {
  // Get current heap usage
  readonly getHeapUsage: Effect.Effect<typeof HeapUsage.Type, DebugError>
  
  // Take heap snapshot (streaming)
  readonly takeHeapSnapshot: Effect.Effect<
    Stream.Stream<string, DebugError>,
    DebugError
  >
  
  // Start/stop allocation tracking
  readonly startTrackingAllocations: Effect.Effect<void, DebugError>
  readonly stopTrackingAllocations: Effect.Effect<void, DebugError>
  
  // Sampling heap profiler
  readonly startSamplingHeapProfiler: (
    samplingInterval?: number
  ) => Effect.Effect<void, DebugError>
  readonly stopSamplingHeapProfiler: Effect.Effect<
    typeof SamplingProfile.Type,
    DebugError
  >
  
  // Force garbage collection
  readonly collectGarbage: Effect.Effect<void, DebugError>
}
```

### Example Usage

```typescript
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as Debug from "@effect-native/debug"
import * as NodeFs from "@effect/platform-node/NodeFileSystem"

const detectMemoryLeak = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  const fs = yield* NodeFs.NodeFileSystem
  
  // Connect to Node.js inspector
  yield* debug.connect({ 
    endpoint: "http://127.0.0.1:9229",
    type: "cdp" 
  })
  
  // Enable heap profiler
  yield* debug.sendCommand({
    method: "HeapProfiler.enable"
  })
  
  // Take baseline snapshot
  console.log("Taking baseline snapshot...")
  const baseline = yield* debug.memory.takeHeapSnapshot
  yield* Stream.runCollect(baseline).pipe(
    Effect.map(chunks => chunks.join("")),
    Effect.flatMap(data => fs.writeFileString("baseline.heapsnapshot", data))
  )
  
  // Perform suspected leak action
  yield* performSuspectedLeakAction()
  
  // Take second snapshot
  console.log("Taking second snapshot...")
  const snapshot2 = yield* debug.memory.takeHeapSnapshot
  yield* Stream.runCollect(snapshot2).pipe(
    Effect.map(chunks => chunks.join("")),
    Effect.flatMap(data => fs.writeFileString("snapshot2.heapsnapshot", data))
  )
  
  // Repeat action
  yield* performSuspectedLeakAction()
  
  // Take third snapshot
  console.log("Taking third snapshot...")
  const snapshot3 = yield* debug.memory.takeHeapSnapshot
  yield* Stream.runCollect(snapshot3).pipe(
    Effect.map(chunks => chunks.join("")),
    Effect.flatMap(data => fs.writeFileString("snapshot3.heapsnapshot", data))
  )
  
  console.log("Snapshots saved. Compare in Chrome DevTools.")
  
  yield* debug.disconnect()
})

// Heap usage monitoring
const monitorHeapUsage = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  
  // Monitor heap every 5 seconds
  yield* Effect.repeat(
    Effect.gen(function* () {
      const usage = yield* debug.memory.getHeapUsage
      const usedMB = (usage.usedSize / 1024 / 1024).toFixed(2)
      const totalMB = (usage.totalSize / 1024 / 1024).toFixed(2)
      console.log(`Heap: ${usedMB} MB / ${totalMB} MB`)
    }),
    Schedule.fixed(Duration.seconds(5))
  )
})

// Sampling profiler
const profileAllocations = Effect.gen(function* () {
  const debug = yield* Debug.Debug
  
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // Start sampling (sample every 32KB)
  yield* debug.memory.startSamplingHeapProfiler(32768)
  
  // Run workload
  yield* runWorkload()
  
  // Stop and get profile
  const profile = yield* debug.memory.stopSamplingHeapProfiler
  
  // Analyze top allocation sites
  console.log("Top allocations:")
  printAllocationTree(profile.head)
  
  yield* debug.disconnect()
})
```

## Testing Requirements

### Memory Debugging Tests
- **Heap Snapshot Streaming**: Verify complete snapshot can be captured and saved.
- **Heap Usage Accuracy**: Compare CDP `getHeapUsage` with in-process `v8.getHeapStatistics()`.
- **GC Triggering**: Ensure `collectGarbage` command reduces heap size.
- **Sampling Profiler**: Verify profile contains allocation call stacks.
- **Cross-Runtime**: Test on Node.js, Deno, and Cloudflare Workers (local dev).

### Integration Test Example

```typescript
import { describe, it, expect } from "vitest"
import * as Effect from "effect/Effect"
import * as Debug from "@effect-native/debug"

describe("Memory Debugging", () => {
  it.effect("should capture heap snapshot", () =>
    Effect.gen(function* () {
      const debug = yield* Debug.Debug
      
      yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
      yield* debug.sendCommand({ method: "HeapProfiler.enable" })
      
      const snapshot = yield* debug.memory.takeHeapSnapshot
      const chunks = yield* Stream.runCollect(snapshot)
      
      expect(chunks.length).toBeGreaterThan(0)
      
      const data = chunks.join("")
      const parsed = JSON.parse(data)
      
      expect(parsed.snapshot).toBeDefined()
      expect(parsed.snapshot.node_count).toBeGreaterThan(0)
      expect(parsed.nodes).toBeDefined()
      expect(parsed.edges).toBeDefined()
      
      yield* debug.disconnect()
    })
  )
  
  it.effect("should get heap usage", () =>
    Effect.gen(function* () {
      const debug = yield* Debug.Debug
      
      yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
      
      const usage = yield* debug.memory.getHeapUsage
      
      expect(usage.usedSize).toBeGreaterThan(0)
      expect(usage.totalSize).toBeGreaterThan(usage.usedSize)
      
      yield* debug.disconnect()
    })
  )
  
  it.effect("should reduce heap after GC", () =>
    Effect.gen(function* () {
      const debug = yield* Debug.Debug
      
      yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
      
      // Allocate large array
      yield* debug.sendCommand({
        method: "Runtime.evaluate",
        params: { expression: "globalThis.leak = new Array(1000000).fill(0)" }
      })
      
      const before = yield* debug.memory.getHeapUsage
      
      // Clear reference and GC
      yield* debug.sendCommand({
        method: "Runtime.evaluate",
        params: { expression: "delete globalThis.leak" }
      })
      yield* debug.memory.collectGarbage
      
      const after = yield* debug.memory.getHeapUsage
      
      expect(after.usedSize).toBeLessThan(before.usedSize)
      
      yield* debug.disconnect()
    })
  )
})
```

## Tools and Libraries

### Analysis Tools
- **Chrome DevTools Memory Tab**: Load .heapsnapshot files, compare snapshots, analyze retainers.
- **@memlab/api**: Meta's automated leak detection (https://facebook.github.io/memlab/).
- **heapsnapshot-parser**: Node.js parser for .heapsnapshot files.
- **clinic.js**: Node.js performance profiling suite (includes heap profiling).
- **0x**: Node.js flamegraph profiler (CPU, but useful with heap data).

### Snapshot Parsers
```bash
# Install heapsnapshot-parser
npm install heapsnapshot-parser

# Parse and query snapshot
node -e "
const parser = require('heapsnapshot-parser');
const fs = require('fs');

const snapshot = parser.parseSnapshot(fs.readFileSync('heap.heapsnapshot', 'utf8'));

// Find objects by class name
const arrays = snapshot.findObjectsWithClass('Array');
console.log('Arrays:', arrays.length);

// Get retainers for specific object
const obj = snapshot.getNodeById(12345);
const retainers = snapshot.getRetainersForNode(obj);
console.log('Retainers:', retainers);
"
```

### MemLab Example (Automated Leak Detection)

```javascript
import { findLeaks } from '@memlab/api';

const scenario = {
  url: () => 'http://localhost:3000',
  
  // Initial action
  action: async (page) => {
    await page.click('#open-modal');
  },
  
  // Action that should cleanup
  back: async (page) => {
    await page.click('#close-modal');
  }
};

const leaks = await findLeaks(scenario);

if (leaks.length > 0) {
  console.log('Memory leaks detected:');
  leaks.forEach(leak => {
    console.log(`- ${leak.retainedSize} bytes: ${leak.className}`);
  });
}
```

## Best Practices

### Snapshot Timing
- **After GC**: Always run GC before taking snapshots for consistency.
- **Idle State**: Take snapshots when app is idle, not mid-action.
- **Warm-Up**: Run actions once before baseline snapshot to stabilize JIT/optimizations.

### Leak Investigation
1. **Reproduce Reliably**: Ensure leak is consistent and reproducible.
2. **Isolate**: Remove code sections until leak disappears.
3. **Compare Snapshots**: Use 3-snapshot technique to isolate growth.
4. **Follow Retainers**: Walk retainer paths from leaked objects to find root cause.
5. **Fix and Verify**: Re-test with snapshots to confirm fix.

### Production Monitoring
- **Sampling Only**: Use sampling heap profiler in production (lower overhead).
- **Heap Usage Metrics**: Monitor `Runtime.getHeapUsage` regularly.
- **GC Metrics**: Track GC frequency and pause times.
- **Alerting**: Alert on sustained heap growth or excessive GC.
- **Avoid Full Snapshots**: Too expensive for production; use only in staging.

### Effect-Specific Considerations
- **Scope Lifecycle**: Effect scopes can capture large closures; profile scope retention.
- **Fiber Leaks**: Long-running fibers that never complete can leak memory.
- **Layer Caching**: Shared layers cache services; profile service retention.
- **Stream Buffers**: Unbounded streams can accumulate unbounded memory.

## Security Considerations

### Snapshot Contents
- **Secrets**: Heap snapshots contain all in-memory data including secrets, tokens, passwords.
- **PII**: User data (emails, names, addresses) visible in snapshots.
- **Encryption**: Consider encrypting snapshots at rest.
- **Sanitization**: Redact sensitive data before sharing snapshots.

### Inspector Access
- **Bind Localhost**: Always bind inspector to 127.0.0.1 in production-like environments.
- **Firewall**: Block inspector ports from external access.
- **Authentication**: Some runtimes support inspector authentication; use it.
- **Disable in Production**: Never expose heap profiling in production environments.

## References

### Protocol Documentation
- Chrome DevTools Protocol - HeapProfiler: https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/
- Chrome DevTools Protocol - Runtime: https://chromedevtools.github.io/devtools-protocol/tot/Runtime/
- WebKit Web Inspector - Heap: https://github.com/WebKit/WebKit/blob/main/Source/JavaScriptCore/inspector/protocol/Heap.json
- Firefox RDP Memory Actor: https://firefox-source-docs.mozilla.org/devtools/backend/protocol.html
- Node.js v8 module: https://nodejs.org/api/v8.html

### Analysis Tools
- Chrome DevTools Memory Profiling: https://developer.chrome.com/docs/devtools/memory-problems/
- MemLab: https://facebook.github.io/memlab/
- heapsnapshot-parser: https://github.com/kumavis/heapsnapshot-parser
- Clinic.js: https://clinicjs.org/

### Learning Resources
- Memory leak patterns: https://developers.google.com/web/tools/chrome-devtools/memory-problems/memory-101
- V8 garbage collection: https://v8.dev/blog/trash-talk
- Heap snapshot format: https://github.com/v8/v8/blob/main/src/profiler/heap-snapshot-generator.h
- Effect memory management: https://effect.website/docs/guides/essentials/resource-management