# Hunting Memory Leaks in Node.js: A Practical Guide with Effect and Chrome DevTools Protocol

**TL;DR**: Memory leaks are sneaky. Your app slowly consumes more memory until it crashes with an OOM error. This guide shows you how to detect, diagnose, and fix memory leaks in Node.js applications using the Chrome DevTools Protocol, heap snapshots, and the three-snapshot technique. We'll build real tools using Effect to automate leak detection.

---

## The Problem: A Mysterious OOM Crash

It's 3 AM. Your phone buzzes. Production is down. Again.

The logs show the same cryptic error:

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

You restart the service. It works fine for a few hours, then crashes again. The pattern is clear: **you have a memory leak**.

Memory leaks in Node.js are particularly insidious because:

1. **They're gradual** - Your app might run fine for hours or days before dying
2. **They're hidden** - Unlike crashes or errors, leaks are silent until the end
3. **They're context-dependent** - What leaks in production might not leak in dev
4. **They compound** - Small leaks become big problems at scale

Let's hunt down and kill these leaks using modern memory debugging tools.

---

## Part 1: Recognizing the Symptoms

Before we can fix a leak, we need to recognize one. Here are the telltale signs:

### 📈 Classic Leak Pattern

```bash
# Monitor memory over time
$ watch -n 5 'ps aux | grep node | grep -v grep'

# You'll see RSS and heap growing linearly:
# Hour 1:  350 MB
# Hour 2:  520 MB  (+170 MB)
# Hour 3:  690 MB  (+170 MB)  ← Linear growth = leak
# Hour 4:  860 MB  (+170 MB)
# Hour 5:  CRASH
```

**Healthy pattern**: Memory grows, stabilizes, fluctuates (sawtooth from GC)  
**Leak pattern**: Memory grows linearly, never stabilizes, GC barely helps

### 🔍 Quick Diagnostic Commands

```bash
# Check current heap usage
node -e "console.log(process.memoryUsage())"

# Monitor in real-time
node --inspect your-app.js &
curl http://localhost:9229/json/list | jq '.[0].webSocketDebuggerUrl'
# Connect debugger and check Memory tab
```

---

## Part 2: The Demo Application (Intentionally Leaky)

Let's create a realistic application with **intentional memory leaks** to practice our debugging skills.

Our demo is a web crawler that fetches pages, caches them, and processes data. It has **four common leak patterns**:

### Leak #1: Unbounded Cache

```typescript
class PageCache {
  private cache = new Map<string, CachedPage>()

  set(url: string, data: PageData) {
    // LEAK: Never evicts old entries
    this.cache.set(url, { url, data, cachedAt: Date.now() })
    // Cache grows forever!
  }
}
```

**Why it leaks**: Every page crawled stays in memory forever. After crawling 10,000 pages, you're holding hundreds of megabytes.

### Leak #2: Event Listeners Never Removed

```typescript
class ProcessingPipeline extends EventEmitter {
  addProcessor(name: string, process: (data: PageData) => void) {
    // LEAK: Listeners accumulate
    this.on('process', process)
    // Never call .off() or .removeListener()
  }
}
```

**Why it leaks**: Event listeners hold references to their callback functions (and their closures). Add 1,000 listeners, keep 1,000 closures alive.

### Leak #3: Closures Capturing Large Objects

```typescript
class PageProcessor {
  process(data: PageData) {
    // LEAK: Closure captures entire `data` (100+ KB)
    const callback = () => {
      console.log(`Processed: ${data.url}`)
      // Only uses URL but captures entire data object
    }
    
    this.callbacks.push(callback)  // Keeps data alive forever
  }
}
```

**Why it leaks**: The closure captures the entire `data` object even though it only needs `data.url`. The 100KB page content is held in memory unnecessarily.

### Leak #4: Global Accumulator

```typescript
// LEAK: Global array that grows forever
const processedPages: Array<ProcessedItem> = []

function processPage(data: PageData) {
  processedPages.push({
    url: data.url,
    pageData: data  // LEAK: Keeping entire page data
  })
}
```

**Why it leaks**: Global state never gets garbage collected. This array grows forever.

---

## Part 3: The Tools - Chrome DevTools Protocol

The Chrome DevTools Protocol (CDP) exposes powerful memory debugging capabilities:

### 🛠️ HeapProfiler Domain

```typescript
// Get current heap usage (lightweight)
Runtime.getHeapUsage()
// Returns: { usedSize: 52428800, totalSize: 104857600 }

// Take heap snapshot (comprehensive but expensive)
HeapProfiler.takeHeapSnapshot()
// Returns: Complete snapshot of all objects in heap

// Start sampling profiler (production-safe)
HeapProfiler.startSampling({ samplingInterval: 32768 })
// ... run workload ...
HeapProfiler.stopSampling()
// Returns: Allocation profile with call stacks

// Force garbage collection
HeapProfiler.collectGarbage()
```

### 📊 What's in a Heap Snapshot?

A heap snapshot is a JSON file containing:

```json
{
  "snapshot": {
    "node_count": 123456,      // Total objects
    "edge_count": 654321       // Total references
  },
  "nodes": [/* flat array of objects */],
  "edges": [/* flat array of references */],
  "strings": ["Window", "Array", "MyClass", ...]
}
```

Each **node** is an object with:
- Type (object, array, string, closure, etc.)
- Name (class name, variable name)
- Size (shallow size in bytes)
- Retained size (size of objects it keeps alive)

Each **edge** is a reference from one object to another.

The snapshot lets us:
- See all objects and their sizes
- Find what's keeping objects alive (retainer paths)
- Compare snapshots to find leaked objects

---

## Part 4: The Three-Snapshot Technique

This is the gold standard for leak detection:

### The Algorithm

```
1. Take BASELINE snapshot
2. Perform suspected action (e.g., process 100 requests)
3. Take AFTER-FIRST snapshot
4. Repeat the same action (e.g., process 100 more requests)
5. Take AFTER-SECOND snapshot
6. Compare AFTER-SECOND vs AFTER-FIRST
```

**Why this works**:
- **One-time allocations** (caches, buffers) appear in snapshot 2 but not snapshot 3
- **Leaks** appear in BOTH snapshots 2 and 3, and GROW between them
- **Normal allocations** (request processing) are freed between snapshots

### Implementing with Effect

```typescript
import { Effect, Console } from "effect"

const detectLeak = Effect.gen(function*() {
  const debug = yield* Debug.Debug
  
  // Connect to Node.js inspector
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  yield* debug.sendCommand({ method: "HeapProfiler.enable" })
  
  // Step 1: Baseline
  yield* debug.memory.collectGarbage()
  yield* saveSnapshot(debug, "baseline.heapsnapshot")
  
  // Step 2: First action
  yield* triggerLeakAction()
  yield* debug.memory.collectGarbage()
  yield* saveSnapshot(debug, "after-first.heapsnapshot")
  
  // Step 3: Repeat action (leaks will grow)
  yield* triggerLeakAction()
  yield* debug.memory.collectGarbage()
  yield* saveSnapshot(debug, "after-second.heapsnapshot")
  
  // Step 4: Analyze
  const growth = yield* compareSnapshots("after-first", "after-second")
  
  if (growth.isLeak) {
    yield* Console.log("🔴 LEAK DETECTED!")
  }
})
```

---

## Part 5: Running the Demo

Let's see the leak in action:

### Start the Leaky Application

```bash
cd packages-native/debug-demos

# Install dependencies
pnpm install

# Run the leaky app with inspector enabled
pnpm demo:leak
```

You'll see output like:

```
🚀 Starting Memory Leak Demo
📊 This app intentionally leaks memory

📈 Iteration 1 complete
   Pages crawled: 10
   Cache size: 8.42 MB (10 entries)
   Heap used: 24.31 MB

📈 Iteration 2 complete
   Pages crawled: 20
   Cache size: 16.85 MB (20 entries)
   Heap used: 40.62 MB

📈 Iteration 3 complete
   Pages crawled: 30
   Cache size: 25.27 MB (30 entries)
   Heap used: 56.93 MB
   ⚠️  WARNING: Heap usage is high!

📈 Iteration 10 complete
   Pages crawled: 100
   Cache size: 84.23 MB (100 entries)
   Heap used: 215.47 MB
   🔴 CRITICAL: Memory leak detected!
```

Notice how memory grows linearly. This is a leak.

### Run the Leak Detector

In another terminal:

```bash
# Run automated leak detector
pnpm demo:detector
```

The detector will:
1. Connect to the running app (port 9229)
2. Take three snapshots
3. Analyze heap growth
4. Report findings

Output:

```
🔍 Starting Memory Leak Detection

📊 STEP 1: Taking baseline snapshot
📸 Taking heap snapshot...
✅ Snapshot saved: baseline.heapsnapshot (24.31 MB)

📊 STEP 2: Performing action (first time)
📸 Taking heap snapshot...
✅ Snapshot saved: after-first-action.heapsnapshot (40.62 MB)

📊 STEP 3: Performing action again
📸 Taking heap snapshot...
✅ Snapshot saved: after-second-action.heapsnapshot (56.93 MB)

📊 STEP 4: Analyzing snapshots

📈 Memory Growth Analysis:
   Baseline heap:     24.31 MB
   After action 1:    40.62 MB (+16.31 MB)
   After action 2:    56.93 MB (+16.31 MB)

🔴 MEMORY LEAK DETECTED!

The heap grew by 32.62 MB (134.2%) across the two actions.

Analysis:
- First action increased heap by 16.31 MB
- Second action increased heap by 16.31 MB
- Growth is consistent, indicating a leak pattern
```

---

## Part 6: Analyzing Snapshots in Chrome DevTools

Now we have three snapshot files. Let's find the leak:

### Open Chrome DevTools

```bash
# Option 1: Use chrome://inspect
open chrome://inspect

# Option 2: Direct connection
node --inspect-brk your-app.js
# Then open: chrome://inspect/#devices
```

### Load Snapshots

1. Click "Open dedicated DevTools for Node"
2. Go to **Memory** tab
3. Click **Load** button
4. Load: `after-second-action.heapsnapshot`

### Compare Snapshots

1. In the dropdown at top, select **"Comparison"**
2. Base snapshot: Select `after-first-action.heapsnapshot`
3. Look for objects with:
   - Positive **# Delta** (more objects)
   - Positive **Size Delta** (larger size)
   - Large **Retained Size**

### What You'll See

```
Constructor         # New  # Deleted  # Delta  Size Delta
─────────────────────────────────────────────────────────
(string)              +8234      -23    +8211    +8.2 MB
(array)               +1523       -5    +1518    +4.1 MB
PageData              +100        -0     +100    +8.4 MB  ← LEAK!
CachedPage            +100        -0     +100    +8.6 MB  ← LEAK!
ProcessedItem         +100        -0     +100    +8.4 MB  ← LEAK!
(closure)             +1200       -0    +1200    +2.1 MB  ← LEAK!
```

**Red flags**:
- `PageData`: 100 new objects, 0 deleted → Never freed!
- `CachedPage`: 100 new objects → Cache never evicts!
- `ProcessedItem`: 100 new objects → Array grows forever!
- `(closure)`: 1200 new closures → Event listeners piling up!

### Find Retainer Paths

Click on `PageData`, expand an instance, look at **Retainers**:

```
PageData @123456
└─ in property 'data' of CachedPage @234567
   └─ in property 'value' of Map @345678
      └─ in property 'cache' of PageCache @456789
         └─ in property 'cache' of WebCrawler @567890
            └─ Window / global object
```

**Bingo!** The retainer path shows:
- `PageData` is held by `CachedPage`
- `CachedPage` is in a `Map`
- The `Map` is `PageCache.cache`
- `PageCache` is held by `WebCrawler`
- `WebCrawler` is global (never freed)

**Root cause**: The cache never evicts entries!

---

## Part 7: Fixing the Leaks

Now that we know what's leaking, let's fix it:

### Fix #1: Bounded LRU Cache

```typescript
class PageCache {
  private cache = new Map<string, CachedPage>()
  private readonly maxEntries = 100  // ✅ Limit
  private accessOrder: Array<string> = []

  set(url: string, data: PageData) {
    this.cache.set(url, { url, data, cachedAt: Date.now() })
    this.accessOrder.push(url)
    
    // ✅ Evict oldest entries
    while (this.cache.size > this.maxEntries) {
      const oldest = this.accessOrder.shift()
      if (oldest) this.cache.delete(oldest)
    }
  }
}
```

**Result**: Cache never grows beyond 100 entries (~ 8.4 MB max).

### Fix #2: Remove Event Listeners

```typescript
class ProcessingPipeline extends EventEmitter {
  private processors = new Map<string, Function>()

  addProcessor(name: string, fn: Function) {
    this.processors.set(name, fn)
    this.on('process', fn)
  }

  // ✅ Add cleanup
  cleanup() {
    for (const [name, fn] of this.processors) {
      this.off('process', fn)  // ✅ Remove listener
    }
    this.processors.clear()
  }
}
```

**Result**: Listeners are removed, closures can be GC'd.

### Fix #3: Don't Capture Large Objects

```typescript
class PageProcessor {
  process(data: PageData) {
    // ✅ Extract only what's needed
    const url = data.url
    
    const callback = () => {
      console.log(`Processed: ${url}`)
      // Only captures small string, not 100KB object
    }
    
    this.callbacks.push(callback)
  }
}
```

**Result**: Each closure captures 50 bytes instead of 100 KB.

### Fix #4: Bounded Buffer

```typescript
class CircularBuffer<T> {
  private buffer: Array<T>
  private readonly capacity: number
  
  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }
  
  push(item: T) {
    this.buffer[this.tail] = item
    this.tail = (this.tail + 1) % this.capacity
    // ✅ Overwrites oldest when full
  }
}

// ✅ Use bounded buffer
const processedPages = new CircularBuffer<ProcessedItem>(1000)
```

**Result**: Never holds more than 1000 items.

---

## Part 8: Verifying the Fix

Run the fixed version:

```bash
pnpm demo:fixed
```

Output:

```
🚀 Starting Memory Leak Demo - FIXED VERSION
✅ This version has all leaks fixed

📈 Iteration 1 complete
   Heap used: 24.31 MB

📈 Iteration 2 complete
   Heap used: 28.62 MB

📈 Iteration 3 complete
   Heap used: 30.15 MB

📈 Iteration 10 complete
   Heap used: 31.47 MB
   ✅ Memory usage is healthy

📈 Iteration 50 complete
   Heap used: 32.18 MB
   ✅ Memory usage is stable!
```

**Success!** Memory stabilizes around 30-32 MB instead of growing to 200+ MB.

### Comparison Chart

```
Time    Leaky Version    Fixed Version
────────────────────────────────────────
1 min      24 MB            24 MB
5 min      56 MB            30 MB
10 min    108 MB            31 MB
30 min    324 MB            32 MB  ← Stable!
1 hour    648 MB            32 MB
2 hours   CRASH!            32 MB  ← Still alive!
```

---

## Part 9: Production Strategies

### Continuous Monitoring

```typescript
const monitorMemory = Effect.gen(function*() {
  const debug = yield* Debug.Debug
  yield* debug.connect({ endpoint: "http://127.0.0.1:9229" })
  
  yield* Effect.repeat(
    Effect.gen(function*() {
      const usage = yield* debug.memory.getHeapUsage
      const usedMB = usage.usedSize / 1024 / 1024
      const percent = (usage.usedSize / usage.totalSize) * 100
      
      yield* Console.log(`Heap: ${usedMB.toFixed(2)} MB (${percent.toFixed(1)}%)`)
      
      // Alert if high
      if (percent > 90) {
        yield* sendAlert("High memory usage!")
      }
    }),
    Schedule.fixed(Duration.seconds(30))
  )
})
```

### Sampling Profiler (Low Overhead)

```typescript
// Safe for production
yield* debug.memory.startSamplingHeapProfiler({
  samplingInterval: 65536  // Sample every 64KB
})

yield* Effect.sleep(Duration.minutes(5))

const profile = yield* debug.memory.stopSamplingHeapProfiler

// Analyze top allocation sites
analyzeHotspots(profile)
```

### Automated Leak Detection in CI

```typescript
// In your test suite
test("should not leak memory", async () => {
  const baseline = await takeSnapshot()
  
  // Perform action 100 times
  for (let i = 0; i < 100; i++) {
    await performAction()
  }
  
  await forceGC()
  const after = await takeSnapshot()
  
  const growth = after.heapUsed - baseline.heapUsed
  const growthMB = growth / 1024 / 1024
  
  // Fail if heap grew more than 10 MB
  expect(growthMB).toBeLessThan(10)
})
```

---

## Part 10: Common Leak Patterns & Fixes

### Pattern: Forgotten Timers

```typescript
// ❌ LEAK
setInterval(() => {
  heavyWork()
}, 1000)
// Timer never cleared

// ✅ FIX
const timer = setInterval(() => {
  heavyWork()
}, 1000)

// Cleanup
clearInterval(timer)
```

### Pattern: Detached DOM Nodes (Browsers)

```typescript
// ❌ LEAK
const div = document.createElement('div')
document.body.appendChild(div)
const button = document.createElement('button')
div.appendChild(button)

button.addEventListener('click', () => {
  // Closure captures button and div
})

document.body.removeChild(div)
// div is detached but button's listener keeps it alive

// ✅ FIX
button.removeEventListener('click', handler)
document.body.removeChild(div)
```

### Pattern: Accumulating Logs

```typescript
// ❌ LEAK
const logs: Array<string> = []

function log(msg: string) {
  logs.push(`${new Date().toISOString()} ${msg}`)
  // Array grows forever
}

// ✅ FIX
class BoundedLogger {
  private logs: Array<string> = []
  private readonly maxLogs = 1000
  
  log(msg: string) {
    this.logs.push(`${new Date().toISOString()} ${msg}`)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()  // Remove oldest
    }
  }
}
```

### Pattern: Effect Fiber Leaks

```typescript
// ❌ LEAK
const fiber = yield* Effect.fork(
  Effect.forever(processData)  // Never completes
)
// Fiber accumulates data forever

// ✅ FIX
const fiber = yield* Effect.fork(
  Effect.repeat(processData, Schedule.recurs(100))
)
yield* Fiber.join(fiber)  // Bounded iterations

// Or with interruption
const fiber = yield* Effect.fork(longRunning)
yield* Effect.sleep(Duration.seconds(30))
yield* Fiber.interrupt(fiber)  // Stop after 30s
```

---

## Part 11: Debugging Checklist

When you suspect a memory leak:

### 1. Confirm the Leak

- [ ] Monitor memory over time (hours/days)
- [ ] Check if growth is linear (not sawtooth)
- [ ] Verify GC doesn't help (run `global.gc()`)
- [ ] Reproduce in isolation (minimal test case)

### 2. Capture Data

- [ ] Take baseline snapshot
- [ ] Perform suspected action
- [ ] Take second snapshot
- [ ] Repeat action
- [ ] Take third snapshot

### 3. Analyze Snapshots

- [ ] Load in Chrome DevTools
- [ ] Use Comparison view
- [ ] Look for growing object counts
- [ ] Check retained sizes
- [ ] Find retainer paths

### 4. Identify Root Cause

- [ ] What type of objects are leaking?
- [ ] What's holding them (retainer chain)?
- [ ] Is it a cache? Event listener? Closure? Global?
- [ ] Can you reproduce with minimal code?

### 5. Fix and Verify

- [ ] Implement fix (bounds, cleanup, weak refs)
- [ ] Run fixed version
- [ ] Confirm memory stabilizes
- [ ] Add regression test
- [ ] Monitor in production

---

## Part 12: Tools Reference

### Chrome DevTools Protocol (CDP)

```typescript
// Connect
const client = await CDP({ port: 9229 })
const { HeapProfiler, Runtime } = client

// Heap usage
const { usedSize, totalSize } = await Runtime.getHeapUsage()

// Snapshot
await HeapProfiler.enable()
const chunks = []
HeapProfiler.addHeapSnapshotChunk(({ chunk }) => {
  chunks.push(chunk)
})
await HeapProfiler.takeHeapSnapshot()
fs.writeFileSync('heap.heapsnapshot', chunks.join(''))

// Force GC
await HeapProfiler.collectGarbage()

// Sampling
await HeapProfiler.startSampling({ samplingInterval: 32768 })
// ... run workload ...
const { profile } = await HeapProfiler.stopSampling()
```

### Node.js v8 Module

```typescript
const v8 = require('v8')

// Heap stats
const stats = v8.getHeapStatistics()
console.log(stats.used_heap_size)

// Snapshot
const stream = v8.getHeapSnapshot()
stream.pipe(fs.createWriteStream('heap.heapsnapshot'))

// With --expose-gc flag
global.gc()
```

### Command Line

```bash
# Start with inspector
node --inspect=9229 --expose-gc app.js

# Take snapshot on signal
node --heapsnapshot-signal=SIGUSR2 app.js
kill -USR2 <pid>

# Increase heap size
node --max-old-space-size=8192 app.js

# Debug flags
node --trace-gc app.js
node --trace-gc-verbose app.js
```

---

## Conclusion

Memory leaks are inevitable in complex applications, but they're not insurmountable. With the right tools and techniques:

1. **Detect** leaks early with monitoring
2. **Diagnose** using heap snapshots and the three-snapshot technique
3. **Fix** by bounding caches, removing listeners, and avoiding closures
4. **Verify** with automated tests and production monitoring

The Chrome DevTools Protocol gives us powerful programmatic access to V8's memory internals. Combined with Effect's structured concurrency, we can build robust debugging tools that catch leaks before they crash production.

### Key Takeaways

- **Monitor continuously**: Track heap usage over time
- **Use three-snapshot technique**: Baseline → Action → Repeat → Compare
- **Follow retainer paths**: Find what's keeping objects alive
- **Bound everything**: Caches, arrays, listeners, timers
- **Test for leaks**: Add memory assertions to your test suite
- **Profile in production**: Use sampling profiler (low overhead)

### Resources

- Demo code: `packages-native/debug-demos`
- CDP HeapProfiler docs: https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/
- Chrome DevTools Memory: https://developer.chrome.com/docs/devtools/memory-problems/
- Node.js v8 module: https://nodejs.org/api/v8.html
- Effect documentation: https://effect.website

Now go forth and slay those leaks! 🗡️

---

**About the Author**: This guide is part of the Effect Native project, bringing native runtime debugging capabilities to Effect TypeScript applications.

**Source Code**: All demos are available in `packages-native/debug-demos` with both leaky and fixed versions.

**Questions?** Open an issue on GitHub or join the Effect Discord.