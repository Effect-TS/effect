/**
 * Cloudflare Workers AI Proxy - FIXED VERSION
 *
 * This is the corrected version of workers-ai-proxy-leak.ts with all leaks fixed.
 * Compare with the leaky version to understand the fixes.
 *
 * FIXES APPLIED:
 * 1. Stream AI responses instead of buffering entire responses
 * 2. Bounded LRU cache for request metadata
 * 3. Circular buffer for logs with size limits
 * 4. Request-scoped data, minimal global state
 * 5. Closures only capture needed data
 * 6. Automatic cleanup of old entries
 *
 * CRITICAL: Workers have 128MB memory limit PER ISOLATE (not per request).
 * A single isolate can serve MULTIPLE CONCURRENT REQUESTS simultaneously,
 * all sharing the same 128MB pool. These fixes ensure:
 * - Streaming uses ~1-2MB per concurrent request (not 50MB)
 * - Bounded caches limit global state (e.g., max 100 entries = ~50KB)
 * - 10 concurrent requests: ~20MB total (vs 500MB with buffering)
 * - Memory stays stable even with high concurrency
 *
 * Run with: wrangler dev --inspector-port=9229
 * Memory should stay stable around 5-15 MB even after hundreds of requests
 * and dozens of concurrent requests
 */

// ============================================================================
// FIX #1: Bounded LRU Cache
// ============================================================================

class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private readonly maxSize: number
  private accessOrder: Array<K> = []

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  set(key: K, value: V): void {
    // Remove if exists (update access order)
    if (this.cache.has(key)) {
      this.accessOrder = this.accessOrder.filter((k) => k !== key)
    }

    this.cache.set(key, value)
    this.accessOrder.push(key)

    // FIX: Evict oldest entries
    while (this.cache.size > this.maxSize) {
      const oldest = this.accessOrder.shift()
      if (oldest !== undefined) {
        this.cache.delete(oldest)
      }
    }
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value === undefined) return undefined

    // Update access order
    this.accessOrder = this.accessOrder.filter((k) => k !== key)
    this.accessOrder.push(key)

    return value
  }

  get size(): number {
    return this.cache.size
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder = []
  }
}

// ============================================================================
// FIX #2: Bounded Circular Buffer for Logs
// ============================================================================

class CircularBuffer<T> {
  private buffer: Array<T | undefined>
  private readonly capacity: number
  private head = 0
  private tail = 0
  private count = 0

  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }

  push(item: T): void {
    this.buffer[this.tail] = item
    this.tail = (this.tail + 1) % this.capacity

    if (this.count < this.capacity) {
      this.count++
    } else {
      // Buffer full, overwrite oldest
      this.head = (this.head + 1) % this.capacity
    }
  }

  toArray(): Array<T> {
    const result: Array<T> = []
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[(this.head + i) % this.capacity]
      if (item !== undefined) {
        result.push(item)
      }
    }
    return result
  }

  get length(): number {
    return this.count
  }

  clear(): void {
    this.buffer = new Array(this.capacity)
    this.head = 0
    this.tail = 0
    this.count = 0
  }
}

// ============================================================================
// FIX #3: Bounded Global State
// ============================================================================

interface RequestMetadata {
  id: string
  timestamp: number
  promptLength: number // FIX: Only store length, not full prompt
  model: string
}

// FIX: Use bounded LRU cache instead of unbounded Map
const requestCache = new LRUCache<string, RequestMetadata>(100)

// FIX: Use circular buffer instead of unbounded array
const requestHistory = new CircularBuffer<string>(1000)

// ============================================================================
// FIX #4: Minimal Logging (No Full Content)
// ============================================================================

interface RequestLog {
  id: string
  timestamp: number
  duration: number
  promptLength: number
  responseLength: number
  model: string
  // FIX: Don't store full prompt/response
  // fullPrompt: string    <-- REMOVED
  // fullResponse: string  <-- REMOVED
}

// FIX: Bounded circular buffer for logs
const requestLogs = new CircularBuffer<RequestLog>(500)

// ============================================================================
// Types
// ============================================================================

interface ChatRequest {
  prompt: string
  model?: string
  max_tokens?: number
  stream?: boolean
}

interface ChatResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// ============================================================================
// Streaming AI API Client (Fixed)
// ============================================================================

class AIAPIClient {
  private apiKey: string
  private baseURL: string

  constructor(apiKey: string, baseURL = "https://openrouter.ai/api/v1") {
    this.apiKey = apiKey
    this.baseURL = baseURL
  }

  /**
   * FIX: Stream the response instead of buffering
   *
   * CONCURRENT REQUEST BENEFIT:
   * - Buffering: 10 concurrent requests × 50MB = 500MB needed → CRASH!
   * - Streaming: 10 concurrent requests × 2MB = 20MB used → Safe!
   *
   * Streaming allows the isolate to handle many concurrent requests
   * simultaneously without exhausting the 128MB limit.
   */
  async chatStream(request: ChatRequest): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: request.model || "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: request.prompt
          }
        ],
        max_tokens: request.max_tokens || 1000,
        stream: true // FIX: Enable streaming
      })
    })

    if (!response.body) {
      throw new Error("No response body")
    }

    // FIX: Return stream directly, don't buffer
    return response.body
  }

  /**
   * FIX: Simulate streaming with TransformStream
   * In real usage, this would be the actual AI API stream
   *
   * CONCURRENT HANDLING:
   * Each concurrent request streams data through without buffering.
   * Memory per request: ~1-2MB (chunks in transit)
   * With 20 concurrent requests: ~40MB total (well within 128MB limit)
   */
  async chatStreamSimulated(
    request: ChatRequest
  ): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder()

    // Simulate streaming response in chunks
    const stream = new ReadableStream({
      async start(controller) {
        // Simulate large response but stream it in chunks
        const totalChunks = 50 + Math.floor(Math.random() * 50)

        for (let i = 0; i < totalChunks; i++) {
          const chunk = `Chunk ${i}: This is part of a large AI response. `.repeat(
            10
          )
          controller.enqueue(encoder.encode(chunk))

          // Simulate network delay
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        controller.close()
      }
    })

    return stream
  }
}

// ============================================================================
// Response Processor (Fixed)
// ============================================================================

class ResponseProcessor {
  // FIX: Don't store handlers that capture data
  // private handlers: Array<(data: string) => void> = []

  /**
   * FIX: Process stream without buffering
   *
   * This processes data in chunks as it flows through, never accumulating
   * the full content in memory. Critical for concurrent request handling.
   */
  async processStream(
    stream: ReadableStream<Uint8Array>,
    requestId: string
  ): Promise<ReadableStream<Uint8Array>> {
    let totalBytes = 0

    // FIX: Use TransformStream to process without buffering
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        // Track size but don't store content
        totalBytes += chunk.length

        // FIX: Only log summary, not content
        if (totalBytes % 10000 < chunk.length) {
          console.log(`[${requestId}] Streamed ${totalBytes} bytes so far`)
        }

        // Pass through unchanged
        controller.enqueue(chunk)
      },
      flush(controller) {
        console.log(`[${requestId}] Stream complete: ${totalBytes} bytes total`)
      }
    })

    // Pipe input stream through transform
    stream.pipeTo(writable).catch((err) => {
      console.error(`[${requestId}] Stream error:`, err)
    })

    return readable
  }

  /**
   * FIX: Transform stream with minimal memory
   */
  async transformStream(
    stream: ReadableStream<Uint8Array>
  ): Promise<ReadableStream<Uint8Array>> {
    // FIX: Transform without buffering entire content
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        // Example: Add prefix to each chunk
        // In real usage: parse SSE, format JSON, etc.
        controller.enqueue(chunk)
      }
    })

    stream.pipeTo(writable).catch((err) => {
      console.error("Transform error:", err)
    })

    return readable
  }
}

// ============================================================================
// AI Proxy Handler (Fixed)
// ============================================================================

class AIProxyHandler {
  private client: AIAPIClient
  private processor: ResponseProcessor

  constructor(apiKey: string) {
    this.client = new AIAPIClient(apiKey)
    this.processor = new ResponseProcessor()
  }

  async handleChatRequest(request: Request): Promise<Response> {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()

    try {
      // Parse request
      const body = (await request.json()) as ChatRequest

      // FIX: Store minimal metadata only
      const metadata: RequestMetadata = {
        id: requestId,
        timestamp: Date.now(),
        promptLength: body.prompt.length, // FIX: Only length, not content
        model: body.model || "gpt-3.5-turbo"
      }

      // FIX: Use bounded cache
      requestCache.set(requestId, metadata)
      requestHistory.push(requestId)

      // FIX: Stream instead of buffering
      console.log(`[${requestId}] Streaming AI response...`)
      const aiStream = await this.client.chatStreamSimulated(body)

      // FIX: Process stream without buffering
      const processedStream = await this.processor.processStream(
        aiStream,
        requestId
      )

      // FIX: Transform stream
      const transformedStream = await this.processor.transformStream(
        processedStream
      )

      const duration = Date.now() - startTime

      // FIX: Log minimal data only (no content)
      const log: RequestLog = {
        id: requestId,
        timestamp: startTime,
        duration,
        promptLength: body.prompt.length,
        responseLength: 0, // Will be updated as we stream
        model: body.model || "gpt-3.5-turbo"
        // FIX: No fullPrompt or fullResponse
      }
      requestLogs.push(log)

      console.log(`[${requestId}] Cache size: ${requestCache.size}/100`)
      console.log(`[${requestId}] History length: ${requestHistory.length}/1000`)
      console.log(`[${requestId}] Logs count: ${requestLogs.length}/500`)

      // FIX: Return streaming response (no buffering)
      return new Response(transformedStream, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "X-Request-ID": requestId,
          "X-Processing-Time": `${duration}ms`,
          "Transfer-Encoding": "chunked" // Indicate streaming
        }
      })
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[${requestId}] Error:`, error)

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          requestId,
          duration
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      )
    }
  }

  getStats() {
    const logs = requestLogs.toArray()
    const avgPromptLength = logs.length > 0
      ? logs.reduce((sum, log) => sum + log.promptLength, 0) / logs.length
      : 0

    return {
      cachedRequests: requestCache.size,
      maxCachedRequests: 100,
      requestHistoryLength: requestHistory.length,
      maxRequestHistory: 1000,
      totalLogs: logs.length,
      maxLogs: 500,
      avgPromptLength: Math.round(avgPromptLength),
      // FIX: Can't calculate response size (not buffered)
      streaming: true,
      memoryOptimized: true
    }
  }
}

// ============================================================================
// Worker Export (Cloudflare Workers format)
// ============================================================================

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url)

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 })
    }

    // Stats endpoint
    if (url.pathname === "/stats") {
      const handler = new AIProxyHandler(env.OPENROUTER_API_KEY || "test-key")
      const stats = handler.getStats()

      return new Response(JSON.stringify(stats, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Chat endpoint (streaming, fixed)
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const handler = new AIProxyHandler(env.OPENROUTER_API_KEY || "test-key")
      return await handler.handleChatRequest(request)
    }

    // Default 404
    return new Response("Not Found", { status: 404 })
  }
}

// ============================================================================
// Development/Testing Notes
// ============================================================================

/**
 * To run this demo:
 *
 * 1. Setup:
 *    wrangler init
 *    # Add this file as src/index.ts
 *
 * 2. Run with inspector:
 *    wrangler dev --inspector-port=9229
 *
 * 3. Test with load (sequential):
 *    for i in {1..200}; do
 *      curl -X POST http://localhost:8787/api/chat \
 *        -H "Content-Type: application/json" \
 *        -d '{"prompt":"Write a long detailed story","max_tokens":2000}'
 *    done
 *
 * 3b. Test with concurrent load (better test):
 *    # Install 'hey' for concurrent requests
 *    hey -n 500 -c 20 -m POST \
 *      -H "Content-Type: application/json" \
 *      -d '{"prompt":"Write a story","max_tokens":2000}' \
 *      http://localhost:8787/api/chat
 *    # 500 requests with 20 concurrent → memory stays stable!
 *
 * 4. Check stats:
 *    curl http://localhost:8787/stats
 *
 * 5. Monitor memory:
 *    # Connect debugger to port 9229
 *    # Take heap snapshots after 10, 50, 100, 200 requests
 *    # Memory should stay stable
 *
 * Expected behavior:
 * - After 20 requests: ~5-10 MB
 * - After 100 requests: ~8-12 MB (stable)
 * - After 500 requests: ~10-15 MB (stable)
 * - With 20 concurrent requests: ~8-12 MB (stable!)
 * - No "Worker exceeded memory limit" errors
 *
 * CONCURRENT REQUEST HANDLING:
 * - Leaky version: 10 concurrent requests → crash (500MB needed)
 * - Fixed version: 20 concurrent requests → ~12 MB (streaming!)
 * - The 128MB-per-isolate limit is shared safely across all concurrent requests
 *
 * Key differences from leaky version:
 * - Responses are streamed, not buffered (critical for concurrent requests)
 * - Caches have size limits (100, 500, 1000) reducing global memory footprint
 * - Logs don't store full content (only metadata)
 * - Old entries automatically evicted (bounded memory usage)
 * - Memory stays stable indefinitely, even under high concurrency
 * - Can handle 20+ concurrent requests safely (vs. 5-10 causing crash in leaky version)
 *
 * What you'll see in snapshots:
 * - requestCache: Max 100 entries (bounded)
 * - requestHistory: Max 1000 entries (circular buffer)
 * - requestLogs: Max 500 entries (circular buffer)
 * - No large string accumulations
 * - Stable heap size
 */
