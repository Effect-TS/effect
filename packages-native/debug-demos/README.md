# @effect-native/debug-demos

Demonstration projects for memory debugging and profiling using the Chrome DevTools Protocol and Effect.

## Overview

This package contains practical examples of:

1. **Memory leak detection** using the three-snapshot technique
2. **Heap snapshot analysis** with Chrome DevTools Protocol
3. **Automated leak detection** tools built with Effect
4. **Common leak patterns** and their fixes

These demos accompany the comprehensive guide in [BLOG-POST.md](./BLOG-POST.md): "Hunting Memory Leaks in Node.js: A Practical Guide with Effect and Chrome DevTools Protocol"

## Installation

```bash
cd packages-native/debug-demos
pnpm install
```

## Quick Start: Using the Steps CLI

The `@effect-native/debug steps` CLI tool lets you step through any of these demos line-by-line. Here's the basic workflow:

**Step 1: Start a demo with the inspector enabled** (it already is by default):

```bash
pnpm demo:leak
# Output: Debugger listening on ws://127.0.0.1:9229/abc-123-def-456
```

**Step 2: In another terminal, connect the stepper** (it auto-discovers the WebSocket URL):

```bash
npx @effect-native/debug steps --ws-url 127.0.0.1:9229
```

**Step 4: Watch the execution unfold**:

```
🔍 Debug Step-Through
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 Connected to ws://127.0.0.1:9229/abc-123-def-456
✅ Debugger enabled
▶️  Runtime.runIfWaitingForDebugger invoked
⏸️  Initial pause requested
🔁 Stepping through code (Ctrl+C to stop)...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[   1] memory-leak-demo.ts:10:0 (anonymous)
      > console.log("🚀 Starting Memory Leak Demo")
[   2] memory-leak-demo.ts:11:0 (anonymous)
      > const cache = new Map()
...
```

Press `Ctrl+C` in either terminal to stop.

**Pro tip**: Use `--max-steps` to limit execution:

```bash
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 100
```

### Using with Automation Scripts

The steps CLI accepts simple endpoints like `127.0.0.1:9229` and automatically discovers the WebSocket URL:

```bash
#!/bin/bash
set -e

# Start your app in background
node --inspect=9229 app.js &
APP_PID=$!

# Wait for inspector to be ready
sleep 1

# Run steps (auto-discovers WebSocket URL from HTTP endpoint)
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 500

# Cleanup
kill $APP_PID
```

**No need for `curl` or `jq`** - just pass the host:port!

## Complete Workflow Examples

### Example 1: Basic Step-Through with Node.js

**Goal**: Step through the memory leak demo to understand the leak pattern.

```bash
# Terminal 1: Start the demo with inspector
cd packages-native/debug-demos
pnpm demo:leak
```

Then in another terminal:

```bash
# Terminal 2: Connect the stepper (auto-discovers WebSocket URL)
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 500
```

You'll see each line execute, including where the cache grows unbounded:

```
[  45] memory-leak-demo.ts:55:4 crawlPage
      > cache.set(url, data)  // 🔴 LEAK: Never evicts!
[  46] memory-leak-demo.ts:56:4 crawlPage
      > listeners.push(handler)  // 🔴 LEAK: Accumulates!
```

### Example 2: Multi-Runtime Support

**With Bun**:
```bash
# Terminal 1
bun --inspect-brk=9229 src/memory-leak-demo.ts

# Terminal 2
npx @effect-native/debug steps --ws-url 127.0.0.1:9229
```

**With Deno**:
```bash
# Terminal 1
deno run --inspect-brk=9229 --allow-all src/memory-leak-demo.ts

# Terminal 2
npx @effect-native/debug steps --ws-url 127.0.0.1:9229
```

### Example 3: Automated Leak Detection Workflow

**Goal**: Use the leak detector to automatically identify memory growth.

```bash
# Terminal 1: Start the leaky app
pnpm demo:leak

# Terminal 2: Run the leak detector (when implemented)
# Note: Currently uses simulated service
pnpm demo:detector --ws-url 127.0.0.1:9229
```

The detector will:
1. Take a baseline snapshot
2. Trigger the leak action
3. Take a second snapshot
4. Repeat the action
5. Take a third snapshot
6. Analyze the growth

### Example 4: Comparing Leaky vs Fixed

**Test the leaky version**:
```bash
# Terminal 1
pnpm demo:leak

# Terminal 2
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 200
# Watch for unbounded growth in cache.set(), listeners.push()
```

**Test the fixed version**:
```bash
# Terminal 1
pnpm demo:fixed

# Terminal 2
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 200
# Watch for bounded LRU cache, proper cleanup
```

### Example 5: Cloudflare Workers (Local)

**Debug a Worker locally**:
```bash
# In a Cloudflare Workers project
wrangler dev --inspector-port=9229

# In another terminal
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 1000
```

This lets you step through Worker code locally before deploying to production.

## Demos

### 1. Memory Leak Demo (Intentionally Leaky)

**File**: `src/memory-leak-demo.ts`

A realistic web crawler application with **four intentional memory leaks**:

- **Leak #1**: Unbounded cache that never evicts entries
- **Leak #2**: Event listeners that accumulate without cleanup
- **Leak #3**: Closures capturing large objects unnecessarily
- **Leak #4**: Global array that grows forever

**Run**:

```bash
# Start with inspector on port 9229
pnpm demo:leak
```

**Use with the steps debugger**:

```bash
# In another terminal, step through the leaky code
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 500
```

**Expected Behavior**:
- Memory grows linearly (~16 MB per iteration)
- After 10 iterations: ~200 MB heap usage
- After 20 iterations: OOM crash

**Output**:

```
🚀 Starting Memory Leak Demo
📊 This app intentionally leaks memory

📈 Iteration 1 complete
   Pages crawled: 10
   Cache size: 8.42 MB (10 entries)
   Heap used: 24.31 MB

📈 Iteration 10 complete
   Pages crawled: 100
   Cache size: 84.23 MB (100 entries)
   Heap used: 215.47 MB
   🔴 CRITICAL: Memory leak detected!
```

### 2. Fixed Version

**File**: `src/memory-leak-fixed.ts`

The same application with **all leaks fixed**:

- **Fix #1**: Bounded LRU cache with automatic eviction
- **Fix #2**: Event listeners properly removed
- **Fix #3**: Closures only capture needed data
- **Fix #4**: Circular buffer instead of unbounded array

**Run**:

```bash
# Start the fixed version with inspector
pnpm demo:fixed
```

**Use with the steps debugger**:

```bash
# In another terminal, verify the fixes by stepping through
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 500
```

**Expected Behavior**:
- Memory stabilizes around 30-32 MB
- No growth after stabilization
- Runs indefinitely without OOM

**Output**:

```
🚀 Starting Memory Leak Demo - FIXED VERSION
✅ This version has all leaks fixed

📈 Iteration 1 complete
   Heap used: 24.31 MB

📈 Iteration 50 complete
   Heap used: 32.18 MB
   ✅ Memory usage is stable!
```

### 3. Automated Leak Detector

**File**: `src/leak-detector.ts`

Implements the **three-snapshot technique** for automated leak detection:

1. Takes baseline snapshot
2. Performs suspected action
3. Takes second snapshot
4. Repeats action
5. Takes third snapshot
6. Analyzes heap growth

**Run**:

```bash
# Terminal 1: Start the leaky app with inspector
pnpm demo:leak

# Terminal 2: Run detector (auto-discovers WebSocket URL)
pnpm demo:detector --ws-url 127.0.0.1:9229
```

**Note**: The leak detector currently uses a simulated debug service. When the real `@effect-native/debug` implementation is complete, it will connect to the actual CDP endpoint.

**Output**:

```
🔍 Starting Memory Leak Detection

📊 STEP 1: Taking baseline snapshot
✅ Snapshot saved: baseline.heapsnapshot (24.31 MB)

📊 STEP 2: Performing action (first time)
✅ Snapshot saved: after-first-action.heapsnapshot (40.62 MB)

📊 STEP 3: Performing action again
✅ Snapshot saved: after-second-action.heapsnapshot (56.93 MB)

📊 STEP 4: Analyzing snapshots

🔴 MEMORY LEAK DETECTED!

The heap grew by 32.62 MB (134.2%) across the two actions.

Next Steps:
1. Load snapshots in Chrome DevTools
2. Use Comparison view
3. Look for objects with positive # Delta and Size Delta
```

**Snapshots saved to**: `./snapshots/`

### 4. Heap Monitor

**File**: `src/heap-monitor.ts`

Real-time heap usage monitoring (coming soon).

### 5. Cloudflare Workers AI Proxy (Leaky)

**File**: `src/workers-ai-proxy-leak.ts`

A realistic **Cloudflare Workers** AI proxy with intentional memory leaks. Demonstrates the unique challenges of the Workers 128MB memory limit and isolate reuse.

**Leaks**:
- Buffering entire AI responses instead of streaming
- Global request metadata cache that grows across requests
- Response handlers with closures capturing large data
- Request/response logging arrays in global scope

**Setup**:

```bash
# Create a Workers project
wrangler init ai-proxy
cd ai-proxy

# Copy the leaky demo
cp path/to/workers-ai-proxy-leak.ts src/index.ts

# Run with inspector
wrangler dev --inspector-port=9229
```

**Debug with steps**:

```bash
# In another terminal, step through the worker code
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 1000
```

**Test**:

```bash
# Send requests
for i in {1..100}; do
  curl -X POST http://localhost:8787/api/chat \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Write a long story","max_tokens":2000}'
done

# Check stats
curl http://localhost:8787/stats
```

**Expected Behavior**:
- After 100 requests: ~100 MB heap usage
- After 200 requests: "Worker exceeded memory limit"
- No error trace, just silent failure

### 6. Cloudflare Workers AI Proxy (Fixed)

**File**: `src/workers-ai-proxy-fixed.ts`

Fixed version showing proper streaming patterns for Workers.

**Fixes**:
- Stream responses with `ReadableStream` and `TransformStream`
- Bounded LRU cache (max 100 entries)
- Circular buffer for logs (max 500 entries)
- Metadata-only logging (no full content)
- Request-scoped data, minimal global state

**Expected Behavior**:
- After 100 requests: ~8-12 MB (stable)
- After 500 requests: ~10-15 MB (stable)
- After 2000 requests: Still stable, no crash

**See Also**: [WORKERS-MEMORY-GUIDE.md](./WORKERS-MEMORY-GUIDE.md) for comprehensive debugging guide.

## Analyzing Snapshots

The leak detector saves three snapshot files:

- `baseline.heapsnapshot` - Before any actions
- `after-first-action.heapsnapshot` - After first action
- `after-second-action.heapsnapshot` - After repeating action

### Using Chrome DevTools

1. **Open DevTools**:
   - Open Chrome and navigate to `chrome://inspect`
   - Or click the WebSocket URL shown in the Node.js output
   - Or use the `@effect-native/debug steps` CLI tool to step through programmatically

2. **Load Snapshots**:
   - Click "Open dedicated DevTools for Node"
   - Go to **Memory** tab
   - Click **Load** button
   - Select `after-second-action.heapsnapshot`

3. **Compare Snapshots**:
   - Dropdown at top: Select **"Comparison"**
   - Base snapshot: `after-first-action.heapsnapshot`
   - Look for:
     - Positive **# Delta** (object count increased)
     - Positive **Size Delta** (size increased)
     - Large **Retained Size**

4. **Find Retainer Paths**:
   - Click on leaked object type (e.g., `PageData`)
   - Expand an instance
   - View **Retainers** section
   - Follow chain to root to find what's keeping it alive

## Understanding the Output

### Leaky Version Indicators

```
Cache size: 84.23 MB (100 entries)        ← Growing
Pipeline listeners: 1200                   ← Growing
Processor callbacks: 1200                  ← Growing
Heap used: 215.47 MB                       ← Growing
🔴 CRITICAL: Memory leak detected!
```

### Fixed Version Indicators

```
Cache size: 8.42 MB (100/100 entries)     ← Bounded
Pipeline listeners: 2                      ← Constant
Processor callbacks: 100                   ← Bounded
Heap used: 32.18 MB                        ← Stable
✅ Memory usage is healthy
```

## Common Leak Patterns

The demos demonstrate these common patterns:

### 1. Unbounded Cache
```typescript
// ❌ LEAK
cache.set(key, value)  // Never evicts

// ✅ FIX
cache.set(key, value)
while (cache.size > maxSize) {
  cache.delete(oldest)
}
```

### 2. Event Listeners
```typescript
// ❌ LEAK
emitter.on('event', handler)  // Never removed

// ✅ FIX
emitter.on('event', handler)
// Later:
emitter.off('event', handler)
```

### 3. Closures
```typescript
// ❌ LEAK
const fn = () => {
  console.log(largeObject.id)  // Captures entire object
}

// ✅ FIX
const id = largeObject.id  // Extract what you need
const fn = () => {
  console.log(id)  // Only captures small value
}
```

### 4. Global Arrays
```typescript
// ❌ LEAK
const items = []
items.push(data)  // Grows forever

// ✅ FIX
const items = new CircularBuffer(1000)
items.push(data)  // Overwrites oldest when full
```

### 5. Buffering Responses (Workers)
```typescript
// ❌ LEAK
const response = await fetch(url)
const text = await response.text()  // Buffers entire response
return new Response(text)

// ✅ FIX
const response = await fetch(url)
return new Response(response.body)  // Stream through
```

### 6. Streaming Transforms (Workers)
```typescript
// ❌ LEAK
const chunks = []
for await (const chunk of stream) {
  chunks.push(chunk)
}
return transform(chunks.join(''))

// ✅ FIX
const { readable, writable } = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(transformChunk(chunk))
  }
})
stream.pipeTo(writable)
return new Response(readable)
```

## Troubleshooting

### Inspector Not Available

**Error**: `ECONNREFUSED 127.0.0.1:9229`

**Fix**:
```bash
# Ensure app is running with --inspect flag
node --inspect=9229 your-app.js

# Check if inspector is listening
curl http://127.0.0.1:9229/json

# Connect with steps (auto-discovers WebSocket URL)
npx @effect-native/debug steps --ws-url 127.0.0.1:9229
```

### Simple Endpoint Format

The `@effect-native/debug steps` command accepts simple endpoints and auto-discovers the WebSocket URL:

```bash
# Just pass the host:port
npx @effect-native/debug steps --ws-url 127.0.0.1:9229

# Or with http:// prefix
npx @effect-native/debug steps --ws-url http://127.0.0.1:9229

# Or the full WebSocket URL if you have it
npx @effect-native/debug steps --ws-url ws://127.0.0.1:9229/abc-123-def-456
```

**No need for `curl` or `jq`** - the tool handles WebSocket URL discovery automatically!

### GC Not Available

**Warning**: `Global GC not available`

**Fix**:
```bash
# Add --expose-gc flag
node --inspect=9229 --expose-gc your-app.js
```

### Snapshots Too Large

**Error**: Out of memory while taking snapshot

**Fix**:
```bash
# Increase Node.js heap size
node --inspect=9229 --expose-gc --max-old-space-size=8192 your-app.js
```

### Can't Load Snapshots in DevTools

**Error**: "Failed to load snapshot"

**Fix**:
- Ensure snapshot file is valid JSON
- Check file size (DevTools has limits ~2GB)
- Try using CLI tools like `heapsnapshot-parser`

## Learning Resources

- **Blog Post**: [BLOG-POST.md](./BLOG-POST.md) - Node.js memory leak guide
- **Workers Guide**: [WORKERS-MEMORY-GUIDE.md](./WORKERS-MEMORY-GUIDE.md) - Cloudflare Workers debugging
- **CDP HeapProfiler**: https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/
- **Chrome DevTools Memory**: https://developer.chrome.com/docs/devtools/memory-problems/
- **Node.js v8 module**: https://nodejs.org/api/v8.html
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Effect**: https://effect.website

## Architecture

```
src/
├── memory-leak-demo.ts           # Node.js leaky app (educational)
├── memory-leak-fixed.ts          # Node.js fixed version (reference)
├── leak-detector.ts              # Automated detector (tool)
├── heap-monitor.ts               # Real-time monitoring (coming soon)
├── workers-ai-proxy-leak.ts      # Workers AI proxy (leaky)
└── workers-ai-proxy-fixed.ts     # Workers AI proxy (fixed)

snapshots/                        # Generated by leak detector
├── baseline.heapsnapshot
├── after-first-action.heapsnapshot
└── after-second-action.heapsnapshot
```

## Testing in CI

You can use the leak detector in CI to catch regressions:

```typescript
// In your test suite
test("should not leak memory", async () => {
  const result = await runLeakDetector(myAction)
  expect(result.leakDetected).toBe(false)
  expect(result.heapGrowthPercent).toBeLessThan(10)
})
```

## Contributing

These demos are educational tools. To add new examples:

1. Create a new file in `src/`
2. Add script to `package.json`
3. Document in this README
4. Update blog post with new pattern

## License

MIT

## Related Packages

- `@effect-native/debug` - Main debugging service (in development)
- `.specs/debug/` - Specifications and research
- `.specs/debug/research-memory.md` - Memory debugging research
- `.specs/debug/tasks/task-006-memory-debugging.md` - Implementation spec

---

**Questions?** See [BLOG-POST.md](./BLOG-POST.md) for detailed explanations or open an issue on GitHub.