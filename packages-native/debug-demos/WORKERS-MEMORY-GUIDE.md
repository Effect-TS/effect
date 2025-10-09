# Debugging Memory Leaks in Cloudflare Workers: AI Proxy Case Study

## The Problem: "Worker exceeded memory limit"

You've built an AI proxy on Cloudflare Workers. It works great in testing. You deploy to production. After handling a few hundred requests, you see this in your logs:

```
Worker exceeded memory limit
```

No stack trace. No error details. Your Worker just... dies.

This guide shows you how to find and fix memory leaks in Cloudflare Workers, using an AI proxy as a real-world example.

---

## Understanding Cloudflare Workers Memory Constraints

### The 128MB Limit

Cloudflare Workers have a **hard 128MB memory limit per isolate**. This includes:

- Your code and dependencies (JS heap + Wasm)
- Request/response data for **all concurrent requests** in that isolate
- Any buffered content
- Global state that persists across requests

**Critical distinction**: The 128MB limit is **per isolate, not per request**. A single isolate can serve multiple concurrent requests simultaneously, all sharing the same 128MB pool.

Unlike Node.js where you can increase heap size with `--max-old-space-size`, Workers give you **128MB per isolate and that's it**.

### The Isolate Model

Workers use V8 isolates, which can be reused across requests. **Important**: A single isolate can handle multiple concurrent requests simultaneously, all sharing the 128MB memory limit.

```
Isolate A (128 MB total):
├─ Request 1 (in progress, using 3 MB)
├─ Request 2 (in progress, using 5 MB)
├─ Request 3 (in progress, using 4 MB)
└─ Global state (6 MB)
   Total: 18 MB / 128 MB

After 100 requests served (sequentially and concurrently):
├─ Request 101 (in progress, using 3 MB)
├─ Request 102 (in progress, using 5 MB)
└─ Global state (120 MB) ← Leak accumulated!
   Total: 128 MB / 128 MB → CRASH on next request!
```

**Critical insights**: 
- Global variables persist across **all requests** in the same isolate
- Multiple concurrent requests share the same 128MB pool
- If you leak on each request, it compounds across both sequential and concurrent requests
- Memory from concurrent requests must fit within the same 128MB limit

### Concurrent Requests and Memory Sharing

**The 128MB limit is shared across ALL concurrent requests in an isolate.**

When your Worker handles multiple requests simultaneously:

```
Scenario: AI Proxy handling 10 concurrent requests

Isolate A (128 MB total):
├─ Request 1: Buffering 20 MB AI response
├─ Request 2: Buffering 15 MB AI response
├─ Request 3: Buffering 25 MB AI response
├─ Request 4: Buffering 18 MB AI response
├─ Request 5: Buffering 22 MB AI response
└─ Global cache: 10 MB
   Total: 110 MB / 128 MB

Now request 6 arrives (needs 20 MB):
110 MB + 20 MB = 130 MB → EXCEEDS LIMIT → CRASH!
```

**This is why buffering is catastrophic in Workers**:

- One request buffering 50 MB? Annoying but manageable.
- Ten concurrent requests each buffering 50 MB? **500 MB needed** but only 128 MB available → **instant crash**.

**Real-world example**:

```typescript
// ❌ DISASTER with concurrent requests
async function handleChat(request: Request) {
  const response = await fetch(AI_API, { ... })
  
  // LEAK: Each concurrent request buffers 20-50 MB
  const fullResponse = await response.text()
  
  // With 5 concurrent requests: 5 × 40 MB = 200 MB needed
  // But you only have 128 MB → CRASH!
  
  return new Response(fullResponse)
}

// ✅ SAFE with concurrent requests
async function handleChat(request: Request) {
  const response = await fetch(AI_API, { ... })
  
  // Stream: Each concurrent request uses ~1-2 MB
  // With 10 concurrent requests: 10 × 2 MB = 20 MB used
  // Well within 128 MB limit!
  
  return new Response(response.body)
}
```

**Key takeaway**: Memory leaks are amplified by concurrency. A 10 MB leak per request becomes a 100 MB problem with 10 concurrent requests.

### Production vs Development

- **Local (`wrangler dev`)**: Inspector available, can debug with DevTools
- **Production**: No inspector access, only logs and tail workers

This means you **must** catch leaks during development/staging.

---

## The Demo Scenario: AI Proxy

We're building an AI proxy that:

1. Receives chat requests from users
2. Forwards to OpenRouter/OpenAI
3. Processes/transforms the response
4. Returns to user

The **naive implementation** buffers entire AI responses in memory. With typical AI responses of 10-100KB (sometimes 1MB+), this quickly exhausts the 128MB limit.

---

## Part 1: The Leaky Implementation

### Leak #1: Buffering Entire Responses

```typescript
// ❌ LEAK
async chat(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ ...request, stream: false })
  })
  
  // LEAK: Entire response loaded into memory (10-100KB)
  const data = await response.json()
  return data
}
```

**Why it leaks**: 
- Sequential: Each request buffers 10-100KB. After 1,000 requests in global state, that's 10-100MB.
- **Concurrent**: If 10 requests are being processed simultaneously, and each buffers 50KB, that's 500KB of active memory **right now**, plus whatever leaked from previous requests.
- The problem compounds: leaked memory from past requests + memory from current concurrent requests.

### Leak #2: Global Request Cache

```typescript
// ❌ LEAK: Global map persists across requests
const requestCache = new Map<string, RequestMetadata>()

function handleRequest(req: Request) {
  const metadata = {
    id: crypto.randomUUID(),
    prompt: await req.text(),  // Full prompt stored
    timestamp: Date.now()
  }
  
  // LEAK: Map grows forever
  requestCache.set(metadata.id, metadata)
}
```

**Why it leaks**: In a long-lived isolate serving concurrent requests, this map can grow to thousands of entries, each holding the full prompt. The map persists across ALL requests (sequential and concurrent), continuously growing.

### Leak #3: Response Buffer Accumulator

```typescript
// ❌ LEAK
const recentResponses: Array<BufferedResponse> = []

function bufferResponse(response: string) {
  recentResponses.push({
    data: response,  // 10-100KB per response
    timestamp: Date.now()
  })
  // Never cleaned up!
}
```

**Why it leaks**: After 100 requests with 50KB responses = 5MB in the global array. After 1,000 requests = 50MB. This global memory is **always allocated**, reducing the available pool for concurrent requests.

### Leak #4: Logging Full Content

```typescript
// ❌ LEAK
const requestLogs: Array<RequestLog> = []

function logRequest(prompt: string, response: string) {
  requestLogs.push({
    fullPrompt: prompt,      // Store entire prompt
    fullResponse: response,  // Store entire response (10-100KB)
    timestamp: Date.now()
  })
  // Array grows forever
}
```

**Why it leaks**: Logging is important, but storing full content in memory is a leak.

### The Death Spiral

```
Request    Cached    Buffered    Logs    Total Heap    Concurrent Impact
-------------------------------------------------------------------------
10         10 KB     500 KB      500 KB    ~1 MB        5 requests × 50KB = 250KB
50         50 KB     2.5 MB      2.5 MB    ~5 MB        5 requests × 50KB = 250KB
100        100 KB    5 MB        5 MB      ~10 MB       10 requests × 50KB = 500KB
500        500 KB    25 MB       25 MB     ~50 MB       10 requests × 50KB = 500KB
1000       1 MB      50 MB       50 MB     ~100 MB      10 requests × 50KB = 500KB
1200       1.2 MB    60 MB       60 MB     ~128 MB → CRASH! (can't fit concurrent requests)
```

**Note**: "Total Heap" includes leaked global state. "Concurrent Impact" shows additional memory needed for requests currently in flight. When Total + Concurrent > 128MB, the isolate crashes.

---

## Part 2: Debugging with Wrangler Dev

### Enable Inspector

```bash
wrangler dev --inspector-port=9229
```

This starts your Worker locally with the Chrome DevTools Protocol enabled.

### Connect Chrome DevTools

1. Open Chrome: `chrome://inspect`
2. Click "Configure..."
3. Add `localhost:9229`
4. Click "inspect" when target appears

### Generate Load

```bash
# Send 100 requests
for i in {1..100}; do
  curl -X POST http://localhost:8787/api/chat \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Write a long story","max_tokens":2000}'
  
  echo "Request $i complete"
  sleep 0.1
done
```

### Monitor Memory Growth

In DevTools → Memory tab:

1. Take **baseline** snapshot (after 0 requests)
2. Send 50 requests
3. Take **after-50** snapshot
4. Send 50 more requests
5. Take **after-100** snapshot

### What You'll See

**Comparison view** (after-100 vs after-50):

```
Constructor           # Delta    Size Delta
--------------------------------------------
(string)              +15234     +8.2 MB
(array)               +523       +4.1 MB
BufferedResponse      +50        +2.5 MB  ← LEAK!
RequestLog            +50        +2.5 MB  ← LEAK!
(closure)             +450       +1.8 MB  ← LEAK!
```

**Red flags**:
- `BufferedResponse` array growing (buffering responses)
- `RequestLog` array growing (storing full content)
- Large string allocations (response content)

### Find Retainer Paths

Click on `BufferedResponse`, expand instance, view **Retainers**:

```
BufferedResponse @123456
└─ in element of Array
   └─ in property 'recentResponses'
      └─ in Window / global scope
```

**Root cause**: Global `recentResponses` array never cleaned up.

---

## Part 3: The Fixes

### Fix #1: Stream Instead of Buffer

```typescript
// ✅ FIX: Stream responses
async chatStream(request: ChatRequest): Promise<ReadableStream> {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ ...request, stream: true })
  })
  
  // Return stream directly (no buffering)
  return response.body!
}

// Return streaming response
return new Response(await chatStream(request), {
  headers: {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked'
  }
})
```

**Result**: Response data flows through without buffering. Memory usage: ~1KB per request instead of 50KB.

### Fix #2: Bounded LRU Cache

```typescript
// ✅ FIX: Bounded cache with eviction
class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private readonly maxSize = 100  // Hard limit
  
  set(key: K, value: V) {
    this.cache.set(key, value)
    
    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const oldest = this.cache.keys().next().value
      this.cache.delete(oldest)
    }
  }
}

const requestCache = new LRUCache<string, RequestMetadata>(100)
```

**Result**: Cache never exceeds 100 entries (~50KB max) instead of growing unbounded.

### Fix #3: Circular Buffer for Logs

```typescript
// ✅ FIX: Circular buffer (overwrites oldest)
class CircularBuffer<T> {
  private buffer: Array<T>
  private head = 0
  private readonly capacity = 500
  
  push(item: T) {
    this.buffer[this.head] = item
    this.head = (this.head + 1) % this.capacity
  }
}

const requestLogs = new CircularBuffer<RequestLog>(500)
```

**Result**: Logs capped at 500 entries instead of growing forever.

### Fix #4: Log Metadata Only

```typescript
// ✅ FIX: Don't store full content
interface RequestLog {
  id: string
  timestamp: number
  promptLength: number      // Just the length
  responseLength: number    // Just the length
  // NO fullPrompt or fullResponse
}
```

**Result**: Each log entry is ~100 bytes instead of 50KB.

### Fix #5: Process Streams Without Buffering

```typescript
// ✅ FIX: Transform stream without buffering
async processStream(stream: ReadableStream): Promise<ReadableStream> {
  const { readable, writable } = new TransformStream({
    transform(chunk, controller) {
      // Process chunk-by-chunk (no buffering)
      const processed = transformChunk(chunk)
      controller.enqueue(processed)
    }
  })
  
  stream.pipeTo(writable)
  return readable
}
```

**Result**: Data flows through in chunks. Memory usage: ~4KB max instead of buffering full response.

---

## Part 4: Verification

### Run Fixed Version

```bash
wrangler dev --inspector-port=9229
# (using workers-ai-proxy-fixed.ts)
```

### Generate Heavy Load

```bash
# Send 500 requests
for i in {1..500}; do
  curl -X POST http://localhost:8787/api/chat \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Write a very long detailed story","max_tokens":2000}'
done
```

### Check Stats

```bash
curl http://localhost:8787/stats
```

**Leaky version** (after 200 requests):
```json
{
  "cachedRequests": 200,
  "bufferedResponses": 200,
  "totalBufferedSizeKB": "10240.00",
  "totalLogs": 200,
  "totalLogsSizeKB": "10240.00",
  "estimatedTotalMemoryKB": "20480.00"
}
```
→ ~20 MB and growing

**Fixed version** (after 500 requests):
```json
{
  "cachedRequests": 100,
  "maxCachedRequests": 100,
  "requestHistoryLength": 500,
  "maxRequestHistory": 1000,
  "totalLogs": 500,
  "maxLogs": 500,
  "streaming": true,
  "memoryOptimized": true
}
```
→ ~5-10 MB and stable

### Memory Comparison

```
                    Leaky          Fixed
                    Version        Version
─────────────────────────────────────────
After 50 requests   ~5 MB          ~5 MB
After 200 requests  ~20 MB         ~8 MB
After 500 requests  ~50 MB         ~10 MB
After 1000 requests ~100 MB        ~12 MB
After 2000 requests CRASH!         ~12 MB (stable)
```

---

## Part 5: Production Strategies

### You Can't Debug Production Workers

Cloudflare doesn't expose inspector protocol for production Workers. You must catch leaks **before** deployment.

### Strategy 1: Load Testing in Staging

```bash
# Use wrk or hey for load testing
hey -n 10000 -c 100 https://staging.yourdomain.com/api/chat

# Monitor wrangler dev during load
# Watch for memory growth
```

### Strategy 2: Tail Workers for Metrics

```typescript
export default {
  async tail(events: TraceEvent[]) {
    for (const event of events) {
      // Log memory metrics
      console.log('Outcome:', event.outcome)
      console.log('CPU time:', event.cpuTime)
      
      if (event.outcome === 'exceededMemory') {
        // Alert! Memory leak detected
        await sendAlert({
          type: 'MEMORY_LEAK',
          worker: 'ai-proxy',
          timestamp: Date.now()
        })
      }
    }
  }
}
```

### Strategy 3: Analytics

Track response sizes and patterns:

```typescript
// In your worker
await env.ANALYTICS.writeDataPoint({
  indexes: [requestId],
  doubles: [responseSize, duration],
  blobs: [model]
})

// Query later to find anomalies
```

### Strategy 4: Gradual Rollout

```
1. Deploy to 1% of traffic
2. Monitor for 24 hours
3. Check error rates and memory metrics
4. If stable, increase to 10%
5. Repeat until 100%
```

### Strategy 5: Circuit Breakers

```typescript
let consecutiveErrors = 0
const MAX_ERRORS = 10

export default {
  async fetch(request: Request) {
    try {
      const response = await handleRequest(request)
      consecutiveErrors = 0
      return response
    } catch (error) {
      consecutiveErrors++
      
      if (consecutiveErrors >= MAX_ERRORS) {
        // Something's wrong, fail fast
        return new Response('Service temporarily unavailable', {
          status: 503
        })
      }
      
      throw error
    }
  }
}
```

---

## Part 6: Workers-Specific Leak Patterns

### Pattern: Buffering Responses

```typescript
// ❌ LEAK
const response = await fetch(url)
const text = await response.text()  // Buffers entire response
return new Response(text)

// ✅ FIX
const response = await fetch(url)
return new Response(response.body)  // Stream through
```

### Pattern: Global Caches

```typescript
// ❌ LEAK
const cache = new Map()
cache.set(key, value)  // Grows forever

// ✅ FIX
const cache = new LRUCache(100)
cache.set(key, value)  // Max 100 entries
```

### Pattern: Request Logging

```typescript
// ❌ LEAK
const logs = []
logs.push({ request: await req.clone().text() })

// ✅ FIX
const logs = new CircularBuffer(1000)
logs.push({ requestId, size: req.headers.get('content-length') })
```

### Pattern: Response Transformation

```typescript
// ❌ LEAK
const chunks = []
for await (const chunk of stream) {
  chunks.push(chunk)  // Buffer all chunks
}
const full = chunks.join('')
return transform(full)

// ✅ FIX
const { readable, writable } = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(transformChunk(chunk))
  }
})
stream.pipeTo(writable)
return new Response(readable)
```

### Pattern: Durable Objects State

```typescript
// ❌ LEAK (in Durable Object)
class ChatRoom {
  messages = []  // Grows forever
  
  async handleMessage(msg: string) {
    this.messages.push(msg)
  }
}

// ✅ FIX
class ChatRoom {
  MAX_MESSAGES = 1000
  
  async handleMessage(msg: string) {
    const messages = await this.state.get('messages') || []
    messages.push(msg)
    
    // Keep only last 1000
    if (messages.length > this.MAX_MESSAGES) {
      messages.shift()
    }
    
    await this.state.put('messages', messages)
  }
}
```

---

## Part 7: Debugging Checklist

### Before You Start

- [ ] Understand the 128MB limit
- [ ] Know that global state persists across requests
- [ ] Have `wrangler dev` with `--inspector-port` ready

### Reproduce the Leak

- [ ] Run `wrangler dev --inspector-port=9229`
- [ ] Generate realistic load (100+ requests)
- [ ] Monitor memory growth in DevTools
- [ ] Confirm leak (linear growth, no GC recovery)

### Capture Snapshots

- [ ] Take baseline snapshot
- [ ] Generate load (e.g., 50 requests)
- [ ] Take second snapshot
- [ ] Generate more load (e.g., 50 requests)
- [ ] Take third snapshot

### Analyze Snapshots

- [ ] Load snapshots in Chrome DevTools
- [ ] Use Comparison view
- [ ] Look for growing arrays/maps
- [ ] Look for large string allocations
- [ ] Find retainer paths to global scope

### Identify Root Causes

- [ ] Are you buffering responses? (Check for `await response.text()`)
- [ ] Are you using global caches? (Check for global `Map`/`Array`)
- [ ] Are you logging full content? (Check log size)
- [ ] Are you accumulating data in closures?

### Fix and Verify

- [ ] Stream responses (use `response.body`, `TransformStream`)
- [ ] Bound caches (use `LRUCache` with max size)
- [ ] Use circular buffers (overwrite oldest)
- [ ] Log metadata only (sizes, not content)
- [ ] Test with heavy load (500+ requests)
- [ ] Confirm memory stabilizes

### Deploy Safely

- [ ] Test in staging with production-like load
- [ ] Enable tail workers for monitoring
- [ ] Use gradual rollout (1% → 10% → 100%)
- [ ] Monitor error rates and latency
- [ ] Have rollback plan ready

---

## Part 8: Tools and Resources

### Wrangler Dev Inspector

```bash
# Start with inspector
wrangler dev --inspector-port=9229

# Access at chrome://inspect
```

### Tail Workers (Production Logs)

```bash
# Stream logs from production
wrangler tail ai-proxy-worker

# Filter for errors
wrangler tail ai-proxy-worker --status error
```

### Workers Analytics

Query memory-related metrics:

```graphql
query {
  viewer {
    accounts(filter: { accountTag: $accountId }) {
      workersInvocationsAdaptive(
        filter: { 
          datetime_gt: "2024-01-01T00:00:00Z"
          scriptName: "ai-proxy-worker"
        }
      ) {
        sum {
          errors
          subrequests
        }
        quantiles {
          cpuTimeP50
          cpuTimeP99
        }
      }
    }
  }
}
```

### Memory Profiling Libraries

```typescript
// Simple memory tracker (development only)
class MemoryTracker {
  private baseline = 0
  
  start() {
    if (global.gc) global.gc()
    this.baseline = (performance as any).memory?.usedJSHeapSize || 0
  }
  
  report(label: string) {
    const current = (performance as any).memory?.usedJSHeapSize || 0
    const delta = current - this.baseline
    console.log(`[${label}] Memory delta: ${(delta / 1024 / 1024).toFixed(2)} MB`)
  }
}
```

---

## Conclusion

Memory leaks in Cloudflare Workers are challenging because:

1. **128MB hard limit per isolate** - No room for error, shared across all concurrent requests
2. **Isolate reuse** - Global state persists and compounds across all requests
3. **Concurrent request sharing** - Multiple requests in the same isolate share the 128MB pool
4. **No production debugging** - Must catch during development
5. **Streaming is essential** - Buffering kills you fast when handling concurrent requests

The key principles:

- ✅ **Stream everything** - Never buffer full responses
- ✅ **Bound all caches** - Use LRU with hard limits
- ✅ **Circular buffers for logs** - Overwrite oldest entries
- ✅ **Metadata only** - Don't store full content
- ✅ **Test with load** - 500+ requests in dev
- ✅ **Monitor in production** - Tail workers and analytics

With these patterns, your Workers can handle millions of requests without hitting memory limits.

---

## Demo Files

- `src/workers-ai-proxy-leak.ts` - Leaky version (educational)
- `src/workers-ai-proxy-fixed.ts` - Fixed version (production-ready)

## Further Reading

- Cloudflare Workers Limits: https://developers.cloudflare.com/workers/platform/limits/
- Wrangler Dev Inspector: https://developers.cloudflare.com/workers/observability/debugging/
- Streaming Responses: https://developers.cloudflare.com/workers/examples/streaming/
- TransformStream API: https://developer.mozilla.org/en-US/docs/Web/API/TransformStream

---

**Remember**: In Workers, memory is precious. Stream everything, bound everything, log carefully. Your 128MB will thank you.