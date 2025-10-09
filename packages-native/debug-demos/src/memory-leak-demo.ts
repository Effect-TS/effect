/**
 * Memory Leak Demo Application
 *
 * This demo simulates a web crawler/data processor that has several
 * intentional memory leaks. It's designed to demonstrate how to use
 * memory debugging tools to identify and fix leaks.
 *
 * LEAKS IN THIS CODE:
 * 1. Unbounded cache that never evicts old entries
 * 2. Event listeners that are never removed
 * 3. Closures capturing large response data
 * 4. Global array accumulating processed items
 *
 * Run with: pnpm demo:leak
 * Then attach debugger to port 9229
 */

import { Chunk, Console, Duration, Effect, Schedule } from "effect"
import { EventEmitter } from "events"

// ============================================================================
// LEAK #1: Unbounded Cache
// ============================================================================

class PageCache {
  private cache = new Map<string, CachedPage>()

  set(url: string, data: PageData) {
    // LEAK: Never evicts old entries, cache grows forever
    this.cache.set(url, {
      url,
      data,
      cachedAt: Date.now(),
      size: JSON.stringify(data).length
    })
  }

  get(url: string): CachedPage | undefined {
    return this.cache.get(url)
  }

  stats() {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0)
    return {
      entries: this.cache.size,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    }
  }
}

// ============================================================================
// LEAK #2: Event Listeners Never Removed
// ============================================================================

class ProcessingPipeline extends EventEmitter {
  private processors: Array<(data: PageData) => void> = []

  addProcessor(name: string, process: (data: PageData) => void) {
    // LEAK: Listeners accumulate, never removed
    this.on("process", process)
    this.processors.push(process)
  }

  async processPage(data: PageData) {
    this.emit("process", data)
  }
}

// ============================================================================
// LEAK #3: Closures Capturing Large Data
// ============================================================================

class PageProcessor {
  private callbacks: Array<() => void> = []

  process(data: PageData) {
    // LEAK: Closure captures entire `data` object even though
    // we only need the URL. The large content stays in memory.
    const callback = () => {
      console.log(`Processed: ${data.url}`)
      // Only uses URL but captures entire data object including content
    }

    // LEAK: Callbacks array grows forever
    this.callbacks.push(callback)
  }

  runCallbacks() {
    this.callbacks.forEach((cb) => cb())
  }
}

// ============================================================================
// LEAK #4: Global Accumulator
// ============================================================================

// LEAK: Global array that accumulates all processed items
const processedPages: Array<ProcessedItem> = []

// ============================================================================
// Types
// ============================================================================

interface PageData {
  url: string
  title: string
  content: string // Large text content
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
  // LEAK: Keeping reference to entire page data
  pageData: PageData
}

// ============================================================================
// Fake Data Generator
// ============================================================================

function generatePageData(index: number): PageData {
  // Generate realistic-sized page content (50-200KB)
  const paragraphs = Math.floor(Math.random() * 100) + 50
  const content = Array(paragraphs)
    .fill(null)
    .map((_, i) => `Paragraph ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. `.repeat(20))
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
      publishDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
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
// Crawler Service
// ============================================================================

class WebCrawler {
  private cache = new PageCache()
  private pipeline = new ProcessingPipeline()
  private processor = new PageProcessor()
  private pageCount = 0

  constructor() {
    // Set up processing pipeline with multiple processors
    this.pipeline.addProcessor("extractor", (data) => {
      // Extract data but don't clean up
      const extracted = {
        title: data.title,
        linkCount: data.links.length
      }
    })

    this.pipeline.addProcessor("analyzer", (data) => {
      // Analyze but keep reference to data
      this.processor.process(data)
    })
  }

  async crawlPage() {
    this.pageCount++
    const pageData = generatePageData(this.pageCount)

    // Store in cache (LEAK: never evicted)
    this.cache.set(pageData.url, pageData)

    // Process through pipeline (LEAK: listeners accumulate)
    await this.pipeline.processPage(pageData)

    // Add to global processed list (LEAK: grows forever)
    processedPages.push({
      url: pageData.url,
      processedAt: Date.now(),
      wordCount: pageData.content.split(/\s+/).length,
      linkCount: pageData.links.length,
      pageData // LEAK: keeping entire page data
    })

    return pageData.url
  }

  getStats() {
    const cacheStats = this.cache.stats()
    return {
      pagesCrawled: this.pageCount,
      cacheEntries: cacheStats.entries,
      cacheSizeMB: cacheStats.totalSizeMB,
      processedItems: processedPages.length,
      pipelineListeners: this.pipeline.listenerCount("process"),
      processorCallbacks: (this.processor as any).callbacks.length
    }
  }
}

// ============================================================================
// Main Application
// ============================================================================

const runCrawler = Effect.gen(function*() {
  yield* Console.log("🚀 Starting Memory Leak Demo")
  yield* Console.log("📊 This app intentionally leaks memory to demonstrate debugging")
  yield* Console.log("🔍 Attach a debugger to port 9229 to analyze\n")

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
      yield* Console.log(`   Cache size: ${stats.cacheSizeMB} MB (${stats.cacheEntries} entries)`)
      yield* Console.log(`   Processed items: ${stats.processedItems}`)
      yield* Console.log(`   Pipeline listeners: ${stats.pipelineListeners}`)
      yield* Console.log(`   Processor callbacks: ${stats.processorCallbacks}`)

      // Show memory usage
      if (global.gc) {
        global.gc()
      }

      const mem = process.memoryUsage()
      yield* Console.log(`   Heap used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`)
      yield* Console.log(`   Heap total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`)
      yield* Console.log(`   RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`)

      // Warning if memory is growing too fast
      const heapUsedMB = mem.heapUsed / 1024 / 1024
      if (heapUsedMB > 100) {
        yield* Console.log(`   ⚠️  WARNING: Heap usage is high!`)
      }
      if (heapUsedMB > 200) {
        yield* Console.log(`   🔴 CRITICAL: Memory leak detected!`)
      }
    }),
    Schedule.spaced(Duration.seconds(3))
  )
})

// ============================================================================
// Run Application
// ============================================================================

Effect.runPromise(runCrawler).catch(console.error)
