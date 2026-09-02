// EFF-1038: measures HTTP server per-request allocation churn and retained-heap
// growth through the in-process web handler path (no sockets, deterministic).
//
// Run with: node --expose-gc packages/effect/benchmark/http/serverAllocations.ts
//
// Exits non-zero when retained heap grows more than RETAINED_LIMIT bytes/request
// (leak gate) or when allocation churn exceeds CHURN_LIMIT bytes/request
// (regression gate for the memory-footprint work).
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import * as inspector from "node:inspector/promises"

const WARMUP = 5_000
const REQUESTS = 50_000
const RETAINED_LIMIT = 64
// main at a1177caf27 measured ~18.5k bytes/request; the EFF-1038 changes
// (skip span attribute recording without a tracing backend, lazy NativeSpan,
// skip abort listeners for synchronously completed fibers) brought it to
// ~16.3k. The limit locks that in with headroom for run-to-run variance;
// ~45% of the remainder is undici Request/Response construction.
const CHURN_LIMIT = 17_000

const gc = (globalThis as any).gc as undefined | (() => void)
if (gc === undefined) {
  console.error("run with --expose-gc")
  process.exit(1)
}

const session = new inspector.Session()
session.connect()

const { dispose, handler } = HttpRouter.toWebHandler(
  HttpRouter.add("GET", "/ping", HttpServerResponse.text("pong")),
  { disableLogger: true }
)

const run = async (count: number) => {
  for (let i = 0; i < count; i++) {
    const response = await handler(new Request("http://localhost/ping"))
    await response.arrayBuffer()
  }
}

interface ProfileNode {
  callFrame: { functionName: string; url: string; lineNumber: number }
  selfSize: number
  children?: Array<ProfileNode>
}

const topFrames = (head: ProfileNode) => {
  const byFrame = new Map<string, number>()
  let total = 0
  const visit = (node: ProfileNode) => {
    if (node.selfSize > 0) {
      const f = node.callFrame
      const url = f.url.replace(/^.*\/(packages|node_modules)\//, "$1/")
      const key = `${f.functionName || "(anonymous)"} @ ${url}:${f.lineNumber + 1}`
      byFrame.set(key, (byFrame.get(key) ?? 0) + node.selfSize)
      total += node.selfSize
    }
    node.children?.forEach(visit)
  }
  visit(head)
  return {
    total,
    frames: [...byFrame.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
  }
}

// repeated gc + macrotask turns let FinalizationRegistry cleanup settle,
// otherwise pending finalizers show up as phantom retention
const heapUsed = async () => {
  for (let i = 0; i < 5; i++) {
    gc()
    await new Promise((resolve) => setImmediate(resolve))
  }
  return process.memoryUsage().heapUsed
}

await run(WARMUP)

// retention phase: no profiler running, so heap deltas reflect the handler only
const heapBefore = await heapUsed()
await run(REQUESTS)
const heapAfter = await heapUsed()

// churn phase: sampled allocation profile including collected objects
await session.post("HeapProfiler.startSampling", {
  samplingInterval: 16384,
  includeObjectsCollectedByMajorGC: true,
  includeObjectsCollectedByMinorGC: true
})
await run(REQUESTS)
const { profile } = await session.post("HeapProfiler.stopSampling")

await dispose()

const { frames, total } = topFrames(profile.head as ProfileNode)
const churnPerRequest = Math.round(total / REQUESTS)
const retainedPerRequest = Math.round((heapAfter - heapBefore) / REQUESTS)

console.log(`requests:            ${REQUESTS}`)
console.log(`allocated/request:   ${churnPerRequest} bytes (limit ${CHURN_LIMIT})`)
console.log(`retained/request:    ${retainedPerRequest} bytes (limit ${RETAINED_LIMIT})`)
console.log("top allocation sites:")
for (const [key, size] of frames) {
  const pct = ((size / total) * 100).toFixed(1).padStart(5)
  console.log(`  ${pct}%  ${(size / 1024 / 1024).toFixed(2).padStart(7)} MiB  ${key}`)
}

if (retainedPerRequest > RETAINED_LIMIT) {
  console.error(`FAIL: retained heap grows ${retainedPerRequest} bytes/request`)
  process.exit(1)
}
if (churnPerRequest > CHURN_LIMIT) {
  console.error(`FAIL: allocation churn ${churnPerRequest} bytes/request exceeds ${CHURN_LIMIT}`)
  process.exit(1)
}
console.log("PASS")
