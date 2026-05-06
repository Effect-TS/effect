/**
 * Liveness Checker - Post-hoc analysis of DST event logs for
 * starvation, deadlock, and infinite scheduling loops.
 *
 * Pure function over event logs — no runtime hooks needed.
 *
 * @internal
 */

import type { DSTEventLog } from "./eventLog.js"

/** @internal */
export interface StarvationEntry {
  readonly fiberId: number
  readonly lastExecuteTick: number
  readonly starvationDuration: number
}

/** @internal */
export interface InfiniteLoopEntry {
  readonly fiberId: number
  readonly executeCount: number
  readonly windowStart: number
  readonly windowEnd: number
  readonly dominanceRatio: number
}

/** @internal */
export interface FiberStats {
  readonly fiberId: number
  readonly executeCount: number
  readonly scheduleCount: number
  readonly firstSeen: number
  readonly lastSeen: number
  readonly completed: boolean
}

/** @internal */
export interface LivenessReport {
  readonly starvation: ReadonlyArray<StarvationEntry>
  readonly deadlockDetected: boolean
  readonly infiniteLoops: ReadonlyArray<InfiniteLoopEntry>
  readonly fiberStats: ReadonlyArray<FiberStats>
  readonly healthy: boolean
}

/** @internal */
export interface LivenessConfig {
  readonly maxStarvationTicks?: number
  readonly loopDetectionWindow?: number
  readonly loopDominanceThreshold?: number
}

/** @internal */
export const checkLiveness = (
  eventLog: DSTEventLog,
  config?: LivenessConfig
): LivenessReport => {
  const maxStarvationTicks = config?.maxStarvationTicks ?? 100
  const loopWindow = config?.loopDetectionWindow ?? 50
  const loopThreshold = config?.loopDominanceThreshold ?? 0.8

  const events = eventLog.events

  // ── Build per-fiber timelines ──────────────────────────────────────

  const fiberExecuteTicks = new Map<number, Array<number>>()
  const fiberScheduleTicks = new Map<number, Array<number>>()
  const completedFibers = new Set<number>()

  for (const event of events) {
    if (event.fiberId === -1) continue

    if (event.action === "execute") {
      const ticks = fiberExecuteTicks.get(event.fiberId)
      if (ticks) {
        ticks.push(event.tick)
      } else {
        fiberExecuteTicks.set(event.fiberId, [event.tick])
      }
    } else if (event.action === "schedule") {
      const ticks = fiberScheduleTicks.get(event.fiberId)
      if (ticks) {
        ticks.push(event.tick)
      } else {
        fiberScheduleTicks.set(event.fiberId, [event.tick])
      }
    } else if (event.action === "complete") {
      completedFibers.add(event.fiberId)
    }
  }

  // ── Starvation detection ────────────────────────────────────────────
  // For each fiber, check if the gap between consecutive executions
  // exceeds maxStarvationTicks.

  const starvation: Array<StarvationEntry> = []

  for (const [fiberId, ticks] of fiberExecuteTicks) {
    for (let i = 1; i < ticks.length; i++) {
      const gap = ticks[i]! - ticks[i - 1]!
      if (gap > maxStarvationTicks) {
        starvation.push({
          fiberId,
          lastExecuteTick: ticks[i - 1]!,
          starvationDuration: gap
        })
      }
    }
  }

  // ── Deadlock detection ──────────────────────────────────────────────
  // Deadlock: the event log ends with no executions in the last N events,
  // only schedule events (fibers are scheduling but nobody is making progress).
  // Or: there are fibers that were scheduled but never completed, and
  // stepping stopped due to maxSteps.

  let deadlockDetected = false
  if (events.length > 10) {
    const tail = events.slice(-10)
    const hasExecute = tail.some(e => e.action === "execute")
    const hasSchedule = tail.some(e => e.action === "schedule")
    if (!hasExecute && hasSchedule) {
      deadlockDetected = true
    }
  }

  // Also detect mutual wait: fibers that were scheduled but never executed
  const scheduledFibers = new Set(fiberScheduleTicks.keys())
  const executedFibers = new Set(fiberExecuteTicks.keys())
  for (const fid of scheduledFibers) {
    if (!executedFibers.has(fid) && fid !== -1) {
      deadlockDetected = true
      break
    }
  }

  // ── Infinite loop detection ─────────────────────────────────────────
  // Sliding window over execute events. If one fiberId appears in >80%
  // of executions in a window, it's monopolizing the scheduler.

  const infiniteLoops: Array<InfiniteLoopEntry> = []
  const executeEvents = events.filter(e => e.action === "execute" && e.fiberId !== -1)

  if (executeEvents.length > loopWindow) {
    for (let start = 0; start <= executeEvents.length - loopWindow; start += Math.floor(loopWindow / 2)) {
      const window = executeEvents.slice(start, start + loopWindow)
      const counts = new Map<number, number>()
      for (const e of window) {
        counts.set(e.fiberId, (counts.get(e.fiberId) ?? 0) + 1)
      }
      for (const [fiberId, count] of counts) {
        const ratio = count / loopWindow
        if (ratio >= loopThreshold) {
          infiniteLoops.push({
            fiberId,
            executeCount: count,
            windowStart: window[0]!.tick,
            windowEnd: window[window.length - 1]!.tick,
            dominanceRatio: ratio
          })
        }
      }
    }
  }

  // ── Fiber stats ─────────────────────────────────────────────────────

  const allFiberIds = new Set([
    ...fiberExecuteTicks.keys(),
    ...fiberScheduleTicks.keys()
  ])

  const fiberStats: Array<FiberStats> = []
  for (const fiberId of allFiberIds) {
    if (fiberId === -1) continue

    const execTicks = fiberExecuteTicks.get(fiberId) ?? []
    const schedTicks = fiberScheduleTicks.get(fiberId) ?? []
    const allTicks = [...execTicks, ...schedTicks]

    fiberStats.push({
      fiberId,
      executeCount: execTicks.length,
      scheduleCount: schedTicks.length,
      firstSeen: allTicks.length > 0 ? Math.min(...allTicks) : 0,
      lastSeen: allTicks.length > 0 ? Math.max(...allTicks) : 0,
      completed: completedFibers.has(fiberId)
    })
  }

  // ── Healthy? ────────────────────────────────────────────────────────

  const healthy = starvation.length === 0
    && !deadlockDetected
    && infiniteLoops.length === 0

  return {
    starvation,
    deadlockDetected,
    infiniteLoops,
    fiberStats,
    healthy
  }
}
