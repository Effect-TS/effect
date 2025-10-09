/**
 * Automated Memory Leak Detector
 *
 * This demo shows how to build an automated leak detector using the
 * @effect-native/debug service. It implements the three-snapshot technique
 * to identify memory leaks programmatically.
 *
 * TECHNIQUE:
 * 1. Take baseline snapshot
 * 2. Perform suspected action
 * 3. Take second snapshot
 * 4. Repeat action (leaks will grow, one-time allocations won't)
 * 5. Take third snapshot
 * 6. Compare snapshots to find growing objects
 *
 * Run with: pnpm demo:detector
 * Then point it at the leaky app running on port 9229
 */

import { Console, Duration, Effect, Stream } from "effect"
import * as fs from "fs/promises"
import * as path from "path"

// ============================================================================
// Simulated Debug Service (placeholder until real implementation)
// ============================================================================

/**
 * NOTE: This is a simplified simulation of the @effect-native/debug service
 * for demonstration purposes. The real implementation will follow the spec
 * defined in .specs/debug/tasks/task-006-memory-debugging.md
 */

interface HeapUsage {
  usedSize: number
  totalSize: number
}

interface SnapshotMetadata {
  path: string
  timestamp: number
  heapUsed: number
  nodeCount?: number
}

class SimulatedDebugService {
  constructor(private endpoint: string) {}

  connect() {
    const endpoint = this.endpoint
    return Effect.gen(function*() {
      yield* Console.log(`🔌 Connecting to inspector at ${endpoint}...`)
      yield* Effect.sleep(Duration.millis(100))
      yield* Console.log("✅ Connected to inspector")
    })
  }

  disconnect() {
    return Effect.sync(() => {
      console.log("🔌 Disconnected from inspector")
    })
  }

  getHeapUsage(): Effect.Effect<HeapUsage> {
    return Effect.sync(() => {
      const mem = process.memoryUsage()
      return {
        usedSize: mem.heapUsed,
        totalSize: mem.heapTotal
      }
    })
  }

  collectGarbage() {
    return Effect.gen(function*() {
      yield* Console.log("🗑️  Forcing garbage collection...")
      if (global.gc) {
        global.gc()
      } else {
        yield* Console.log(
          "⚠️  Global GC not available. Run with --expose-gc flag."
        )
      }
    })
  }

  takeHeapSnapshot(outputPath: string): Effect.Effect<SnapshotMetadata> {
    return Effect.gen(function*() {
      yield* Console.log(`📸 Taking heap snapshot...`)

      // Simulate snapshot capture
      yield* Effect.sleep(Duration.seconds(1))

      const mem = process.memoryUsage()
      const metadata: SnapshotMetadata = {
        path: outputPath,
        timestamp: Date.now(),
        heapUsed: mem.heapUsed
      }

      // In real implementation, this would stream snapshot data
      const mockSnapshot = JSON.stringify({
        snapshot: {
          meta: {
            node_fields: ["type", "name", "id", "self_size"],
            node_types: [["object", "array", "string"]]
          },
          node_count: 10000
        },
        nodes: [],
        edges: [],
        strings: []
      })

      yield* Effect.promise(() => fs.writeFile(outputPath, mockSnapshot))

      yield* Console.log(
        `✅ Snapshot saved: ${path.basename(outputPath)} (${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB)`
      )

      return metadata
    })
  }
}

// ============================================================================
// Leak Detector
// ============================================================================

interface LeakDetectionConfig {
  inspectorEndpoint: string
  outputDir: string
  actionDelayMs: number
  gcBeforeSnapshot: boolean
}

interface LeakDetectionResult {
  leakDetected: boolean
  snapshots: Array<SnapshotMetadata>
  heapGrowth: number
  heapGrowthPercent: number
  analysis: string
}

const defaultConfig: LeakDetectionConfig = {
  inspectorEndpoint: "http://127.0.0.1:9229",
  outputDir: "./snapshots",
  actionDelayMs: 5000,
  gcBeforeSnapshot: true
}

/**
 * Run the three-snapshot leak detection technique
 */
const detectMemoryLeaks = (
  performAction: Effect.Effect<void>,
  config: Partial<LeakDetectionConfig> = {}
): Effect.Effect<LeakDetectionResult> => {
  const cfg = { ...defaultConfig, ...config }

  return Effect.gen(function*() {
    const debug = new SimulatedDebugService(cfg.inspectorEndpoint)

    yield* Console.log("🔍 Starting Memory Leak Detection")
    yield* Console.log("━".repeat(60))
    yield* Console.log("")

    // Connect to inspector
    yield* debug.connect()

    // Ensure output directory exists
    yield* Effect.promise(() => fs.mkdir(cfg.outputDir, { recursive: true }))

    const snapshots: Array<SnapshotMetadata> = []

    // ========================================================================
    // STEP 1: Baseline Snapshot
    // ========================================================================
    yield* Console.log("📊 STEP 1: Taking baseline snapshot")
    yield* Console.log("   Waiting for application to stabilize...")
    yield* Effect.sleep(Duration.millis(2000))

    if (cfg.gcBeforeSnapshot) {
      yield* debug.collectGarbage()
      yield* Effect.sleep(Duration.millis(500))
    }

    const baseline = yield* debug.takeHeapSnapshot(
      path.join(cfg.outputDir, "baseline.heapsnapshot")
    )
    snapshots.push(baseline)

    yield* Console.log("")
    yield* Effect.sleep(Duration.millis(1000))

    // ========================================================================
    // STEP 2: First Action + Snapshot
    // ========================================================================
    yield* Console.log("📊 STEP 2: Performing action (first time)")
    yield* performAction
    yield* Console.log(`   Waiting ${cfg.actionDelayMs}ms for allocations...`)
    yield* Effect.sleep(Duration.millis(cfg.actionDelayMs))

    if (cfg.gcBeforeSnapshot) {
      yield* debug.collectGarbage()
      yield* Effect.sleep(Duration.millis(500))
    }

    const afterFirst = yield* debug.takeHeapSnapshot(
      path.join(cfg.outputDir, "after-first-action.heapsnapshot")
    )
    snapshots.push(afterFirst)

    yield* Console.log("")
    yield* Effect.sleep(Duration.millis(1000))

    // ========================================================================
    // STEP 3: Second Action + Snapshot
    // ========================================================================
    yield* Console.log(
      "📊 STEP 3: Performing action again (to detect growing objects)"
    )
    yield* performAction
    yield* Console.log(`   Waiting ${cfg.actionDelayMs}ms for allocations...`)
    yield* Effect.sleep(Duration.millis(cfg.actionDelayMs))

    if (cfg.gcBeforeSnapshot) {
      yield* debug.collectGarbage()
      yield* Effect.sleep(Duration.millis(500))
    }

    const afterSecond = yield* debug.takeHeapSnapshot(
      path.join(cfg.outputDir, "after-second-action.heapsnapshot")
    )
    snapshots.push(afterSecond)

    yield* Console.log("")

    // ========================================================================
    // STEP 4: Analysis
    // ========================================================================
    yield* Console.log("📊 STEP 4: Analyzing snapshots")
    yield* Console.log("")

    const firstGrowth = afterFirst.heapUsed - baseline.heapUsed
    const secondGrowth = afterSecond.heapUsed - afterFirst.heapUsed
    const totalGrowth = afterSecond.heapUsed - baseline.heapUsed

    yield* Console.log("📈 Memory Growth Analysis:")
    yield* Console.log(
      `   Baseline heap:     ${(baseline.heapUsed / 1024 / 1024).toFixed(2)} MB`
    )
    yield* Console.log(
      `   After action 1:    ${(afterFirst.heapUsed / 1024 / 1024).toFixed(2)} MB (+${
        (firstGrowth / 1024 / 1024).toFixed(2)
      } MB)`
    )
    yield* Console.log(
      `   After action 2:    ${(afterSecond.heapUsed / 1024 / 1024).toFixed(2)} MB (+${
        (secondGrowth / 1024 / 1024).toFixed(2)
      } MB)`
    )
    yield* Console.log("")

    const growthPercent = (totalGrowth / baseline.heapUsed) * 100

    // Leak detection heuristic
    const leakDetected = secondGrowth > 0 && // Heap still growing
      secondGrowth >= firstGrowth * 0.5 && // Second growth is at least 50% of first
      totalGrowth > 5 * 1024 * 1024 // Total growth > 5MB

    let analysis = ""

    if (leakDetected) {
      analysis = `
🔴 MEMORY LEAK DETECTED!

The heap grew by ${(totalGrowth / 1024 / 1024).toFixed(2)} MB (${growthPercent.toFixed(1)}%) across the two actions.

Analysis:
- First action increased heap by ${(firstGrowth / 1024 / 1024).toFixed(2)} MB
- Second action increased heap by ${(secondGrowth / 1024 / 1024).toFixed(2)} MB
- Growth is consistent, indicating a leak pattern

Next Steps:
1. Load snapshots in Chrome DevTools:
   - Open chrome://inspect
   - Click "Open dedicated DevTools for Node"
   - Go to Memory tab → Load
   - Load: after-second-action.heapsnapshot
   - Select "Comparison" view
   - Base: after-first-action.heapsnapshot

2. Look for objects with:
   - Positive "# Delta" (object count increased)
   - Positive "Size Delta" (size increased)
   - Large "Retained Size"

3. For leaked objects:
   - Expand the object
   - View "Retainers" section
   - Follow chain to find what's keeping it alive

Common leak patterns:
- Event listeners not removed
- Closures capturing large objects
- Unbounded caches/arrays
- References in global scope
      `.trim()
    } else {
      analysis = `
✅ NO SIGNIFICANT LEAK DETECTED

The heap growth appears normal:
- First action: +${(firstGrowth / 1024 / 1024).toFixed(2)} MB
- Second action: +${(secondGrowth / 1024 / 1024).toFixed(2)} MB
- Total growth: +${(totalGrowth / 1024 / 1024).toFixed(2)} MB (${growthPercent.toFixed(1)}%)

This could indicate:
- Allocations are one-time (caches, buffers)
- Objects are properly released after use
- Growth is within expected bounds

If you still suspect a leak:
- Run more iterations to confirm trend
- Check if growth continues linearly
- Review snapshots for unexpected object retention
      `.trim()
    }

    yield* Console.log(analysis)
    yield* Console.log("")

    // Disconnect
    yield* debug.disconnect()

    yield* Console.log("━".repeat(60))
    yield* Console.log(
      `📁 Snapshots saved in: ${path.resolve(cfg.outputDir)}`
    )

    return {
      leakDetected,
      snapshots,
      heapGrowth: totalGrowth,
      heapGrowthPercent: growthPercent,
      analysis
    }
  })
}

// ============================================================================
// Demo: Detect Leaks in Running Application
// ============================================================================

/**
 * Simulated action that triggers the leak
 * In real usage, this would interact with the target application
 */
const triggerLeakAction = Effect.gen(function*() {
  yield* Console.log("   → Triggering leak action in target app...")

  // In real implementation, this would:
  // 1. Call an endpoint that exercises the leak
  // 2. Or evaluate code in the target via Runtime.evaluate
  // 3. Or trigger user interactions via automation

  yield* Effect.sync(() => {
    // Simulate triggering action
    console.log("   → (In real usage: HTTP call, CDP eval, etc.)")
  })
})

// ============================================================================
// Main Program
// ============================================================================

const program = Effect.gen(function*() {
  yield* Console.log("")
  yield* Console.log("🔬 Automated Memory Leak Detector")
  yield* Console.log("   Using Three-Snapshot Technique")
  yield* Console.log("")

  const result = yield* detectMemoryLeaks(triggerLeakAction, {
    inspectorEndpoint: "http://127.0.0.1:9229",
    outputDir: "./snapshots",
    actionDelayMs: 3000,
    gcBeforeSnapshot: true
  })

  yield* Console.log("")
  yield* Console.log("🏁 Detection Complete")
  yield* Console.log("")

  if (result.leakDetected) {
    yield* Console.log("❌ Leak detected - review snapshots to identify source")
    process.exitCode = 1
  } else {
    yield* Console.log("✅ No significant leak detected")
    process.exitCode = 0
  }
})

Effect.runPromise(program).catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
