/**
 * Memory Leak Demo - FIXED VERSION
 *
 * This is the corrected version of memory-leak-demo.ts with all leaks fixed.
 * Compare with the leaky version to understand the fixes.
 *
 * FIXES APPLIED:
 * 1. Bounded LRU cache with automatic eviction
 * 2. Event listeners properly removed after use
 * 3. Closures only capture needed data, not entire objects
 * 4. Global array replaced with bounded circular buffer
 *
 * Run with: pnpm demo:fixed
 * Then compare memory usage with the leaky version
 */

import { Chunk, Console, Duration, Effect, Schedule } from "effect"
import { EventEmitter } from "events"

// ============================================================================
// FIX #1: Bounded LRU Cache with Eviction
// ============================================================================

class PageCache {
  private cache = new Map<string, CachedPage>()
  private readonly maxEntries: number
  private readonly maxAgeMsec: number
  private accessOrder: Array<string> = []

  constructor(maxEntries = 100, maxAgeMinutes = 30) {
    this.maxEntries = maxEntries
    this.maxAgeMsec = maxAgeMinutes * 60 * 1000
  }

  set(url: string, data: PageData) {
    // Remove if already exists (to update access order)
    if (this.cache.has(url)) {
      this.accessOrder = this.accessOrder.filter((u) => u !== url)
    }

    // Add to cache and track access order
    this.cache.set(url, {
      url,
      data,
      cachedAt: Date.now(),
      size: JSON.stringify(data).length
    })
    this.accessOrder.push(url)

    // FIX: Evict old entries if over limit
    this.evictIfNeeded()
  }

  get(url: string): CachedPage | undefined {
    const entry = this.cache.get(url)
    if (!entry) return undefined

    // FIX: Check if entry is expired
    if (Date.now() - entry.cachedAt > this.maxAgeMsec) {
      this.cache.delete(url)
      this.accessOrder = this.accessOrder.filter((u) => u !== url)
      return undefined
    }

    // Update access order (move to end)
    this.accessOrder = this.accessOrder.filter((u) => u !== url)
    this.accessOrder.push(url)

    return entry
  }

  private evictIfNeeded() {
    // FIX: Remove oldest entries if over limit
    while (this.cache.size > this.maxEntries) {
      const oldest = this.accessOrder.shift()
      if (oldest) {
        this.cache.delete(oldest)
      }
    }

    // FIX: Remove expired entries
    const now = Date.now()
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.cachedAt > this.maxAgeMsec) {
        this.cache.delete(url)
        this.accessOrder = this.accessOrder.filter((u) => u !== url)
      }
    }
  }

  stats() {
    const totalSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    )
    return {
      entries: this.cache.size,
      maxEntries: this.maxEntries,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    }
  }

  clear() {
    this.cache.clear()
    this.accessOrder = []
  }
}

// ============================================================================
// FIX #2: Event Listeners Properly Managed
// ============================================================================

class ProcessingPipeline extends EventEmitter {
  private processors = new Map<string, (data: PageData) => void>()

  addProcessor(name: string, process: (data: PageData) => void) {
    // FIX: Track processors so we can remove them
    this.processors.set(name, process)
    this.on("process", process)
  }

  removeProcessor(name: string) {
    // FIX: Properly remove listener to prevent leaks
    const processor = this.processors.get(name)
    if (processor) {
      this.off("process", processor)
      this.processors.delete(name)
    }
  }

  async processPage(data: PageData) {
    this.emit("process", data)
  }

  cleanup() {
    // FIX: Remove all listeners on cleanup
    for (const [name, processor] of this.processors.entries()) {
      this.off("process", processor)
    }
    this.processors.clear()
    this.removeAllListeners()
  }
}

// ============================================================================
// FIX #3: Closures Only Capture Needed Data
// ============================================================================

class PageProcessor {
  private callbacks: Array<() => void> = []
  private readonly maxCallbacks: number

  constructor(maxCallbacks = 100) {
    this.maxCallbacks = maxCallbacks
  }

  process(data: PageData) {
    // FIX: Only capture what we need (URL), not entire data object
    const url = data.url // Extract only what's needed
    const callback = () => {
      console.log(`Processed: ${url}`) // Only captures url string, not entire data
    }

    this.callbacks.push(callback)

    // FIX: Limit callback array size
    if (this.callbacks.length > this.maxCallbacks) {
      this.callbacks.shift() // Remove oldest
    }
  }

  runCallbacks() {
    this.callbacks.forEach((cb) => cb())
  }

  clear() {
    this.callbacks = []
  }
}

// ============================================================================
// FIX #4: Bounded Circular Buffer Instead of Global Array
// ============================================================================

class CircularBuffer<T> {
  private buffer: Array<T>
  private readonly capacity: number
  private head = 0
  private tail = 0
  private count = 0

  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }

  push(item: T) {
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
      result.push(this.buffer[(this.head + i) % this.capacity])
    }
    return result
  }

  get length(): number {
    return this.count
  }

  clear() {
    this.buffer = new Array(this.capacity)
    this.head = 0
    this.tail = 0
    this.count = 0
  }
}

// FIX: Use bounded buffer instead of unbounded global array
const processedPages = new CircularBuffer<ProcessedItem>(1000)

// ============================================================================
// Types
// ============================================================================

interface PageData {
  url: string
  title: string
  content: string
  links: Array<string>
  metadata: Record<string, unknown>
  fetchedAt: number
}

interface CachedPage {
  url: string
  data: PageData
  cachedAt: number
  size: number
}

interface ProcessedItem {
  url: string
  processedAt: number
  wordCount: number
  linkCount: number
  // FIX: Don't keep reference to entire page data
  // pageData: PageData  <-- REMOVED
}

// ============================================================================
// Fake Data Generator
// ============================================================================

function generatePageData(index: number): PageData {
  // Generate realistic-sized page content (50-200KB)
  const paragraphs = Math.floor(Math.random() * 100) + 50
  const content = Array(paragraphs)
    .fill(null)
    .map(
      (_, i) =>
        `Paragraph ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. `.repeat(
          20
        )
    )
    .join("\n\n")

  const links = Array(Math.floor(Math.random() * 50) + 10)
    .fill(null)
    .map((_, i) => `https://example.com/page-${index}-link-${i}`)

  return {
    url: `https://example.com/page-${index}`,
    title: `Page ${index} - Example Site`,
    content,
    links,
    metadata: {
      author: `Author ${index % 100}`,
      publishDate: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      tags: [`tag-${index % 20}`, `category-${index % 10}`],
      stats: {
        views: Math.floor(Math.random() * 10000),
        shares: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 100)
      }
    },
    fetchedAt: Date.now()
  }
}

// ============================================================================
// Crawler Service - FIXED
// ============================================================================

class WebCrawler {
  private cache: PageCache
  private pipeline: ProcessingPipeline
  private processor: PageProcessor
  private pageCount = 0

  constructor() {
    // FIX: Use bounded cache
    this.cache = new PageCache(100, 30) // Max 100 entries, 30 min TTL
    this.pipeline = new ProcessingPipeline()
    this.processor = new PageProcessor(100) // Max 100 callbacks

    // Set up processing pipeline
    this.pipeline.addProcessor("extractor", (data) => {
      // Extract only what we need
      const extracted = {
        title: data.title,
        linkCount: data.links.length
      }
      // extracted goes out of scope, can be GC'd
    })

    this.pipeline.addProcessor("analyzer", (data) => {
      // Process but don't keep reference
      this.processor.process(data)
      // data can be GC'd after this
    })
  }

  async crawlPage() {
    this.pageCount++
    const pageData = generatePageData(this.pageCount)

    // Store in cache (FIX: will auto-evict old entries)
    this.cache.set(pageData.url, pageData)

    // Process through pipeline
    await this.pipeline.processPage(pageData)

    // FIX: Only store minimal data, not entire page
    processedPages.push({
      url: pageData.url,
      processedAt: Date.now(),
      wordCount: pageData.content.split(/\s+/).length,
      linkCount: pageData.links.length
      // FIX: Not keeping pageData reference
    })

    // pageData goes out of scope here and can be GC'd

    return pageData.url
  }

  getStats() {
    const cacheStats = this.cache.stats()
    return {
      pagesCrawled: this.pageCount,
      cacheEntries: cacheStats.entries,
      cacheMaxEntries: cacheStats.maxEntries,
      cacheSizeMB: cacheStats.totalSizeMB,
      processedItems: processedPages.length,
      pipelineListeners: this.pipeline.listenerCount("process"),
      processorCallbacks: (this.processor as any).callbacks.length
    }
  }

  cleanup() {
    // FIX: Proper cleanup
    this.cache.clear()
    this.pipeline.cleanup()
    this.processor.clear()
  }
}

// ============================================================================
// Main Application - FIXED
// ============================================================================

const runCrawler = Effect.gen(function*() {
  yield* Console.log("🚀 Starting Memory Leak Demo - FIXED VERSION")
  yield* Console.log("✅ This version has all leaks fixed")
  yield* Console.log("📊 Compare memory usage with the leaky version\n")

  const crawler = new WebCrawler()
  let iteration = 0

  yield* Effect.repeat(
    Effect.gen(function*() {
      iteration++

      // Crawl 10 pages per iteration
      const urls = yield* Effect.all(
        Chunk.range(1, 10).pipe(
          Chunk.map(() => Effect.promise(() => crawler.crawlPage()))
        ),
        { concurrency: "unbounded" }
      )

      const stats = crawler.getStats()

      yield* Console.log(`\n📈 Iteration ${iteration} complete`)
      yield* Console.log(`   Pages crawled: ${stats.pagesCrawled}`)
      yield* Console.log(
        `   Cache size: ${stats.cacheSizeMB} MB (${stats.cacheEntries}/${stats.cacheMaxEntries} entries)`
      )
      yield* Console.log(`   Processed items: ${stats.processedItems}`)
      yield* Console.log(`   Pipeline listeners: ${stats.pipelineListeners}`)
      yield* Console.log(`   Processor callbacks: ${stats.processorCallbacks}`)

      // Show memory usage
      if (global.gc) {
        global.gc()
      }

      const mem = process.memoryUsage()
      yield* Console.log(
        `   Heap used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`
      )
      yield* Console.log(
        `   Heap total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`
      )
      yield* Console.log(`   RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`)

      // Memory should stay stable in fixed version
      const heapUsedMB = mem.heapUsed / 1024 / 1024
      if (heapUsedMB < 50) {
        yield* Console.log(`   ✅ Memory usage is healthy`)
      } else if (heapUsedMB < 100) {
        yield* Console.log(`   ⚠️  Memory usage is moderate`)
      } else {
        yield* Console.log(`   🔴 Unexpected high memory usage`)
      }
    }),
    Schedule.spaced(Duration.seconds(3))
  )
})

// ============================================================================
// Run Application
// ============================================================================

Effect.runPromise(runCrawler).catch(console.error)
