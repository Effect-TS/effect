/**
 * Cascade Exporter - Exports DST event logs in NDJSON format compatible
 * with Vajra's cascade analysis command.
 *
 * @internal
 */

import type { DSTEventLog, DSTEvent } from "effect/internal/dst/eventLog.js"

/** @internal */
export interface FiberHotspot {
  readonly fiberId: number
  readonly executeCount: number
  readonly percentage: number
}

/**
 * Convert a DST event log to NDJSON for Vajra cascade analysis.
 *
 * Each line maps directly to a DSTEvent with fields that Vajra expects:
 * - entity-field: fiberId
 * - time-field: tick
 * - event-field: action
 *
 * @internal
 */
export const eventLogToNDJSON = (eventLog: DSTEventLog): string =>
  eventLog.events
    .map((event) =>
      JSON.stringify({
        fiberId: event.fiberId,
        tick: event.tick,
        action: event.action,
        priority: event.priority,
        pendingCount: event.pendingCount,
        chosenIndex: event.chosenIndex
      })
    )
    .join("\n")

/**
 * Analyze which fibers dominate the schedule.
 *
 * @internal
 */
export const analyzeHotFibers = (eventLog: DSTEventLog): ReadonlyArray<FiberHotspot> => {
  const executeCounts = new Map<number, number>()
  let totalExecutes = 0

  for (const event of eventLog.events) {
    if (event.action === "execute" && event.fiberId !== -1) {
      executeCounts.set(event.fiberId, (executeCounts.get(event.fiberId) ?? 0) + 1)
      totalExecutes++
    }
  }

  return [...executeCounts.entries()]
    .map(([fiberId, count]) => ({
      fiberId,
      executeCount: count,
      percentage: totalExecutes > 0 ? (count / totalExecutes) * 100 : 0
    }))
    .sort((a, b) => b.executeCount - a.executeCount)
}

/**
 * Returns the Vajra CLI arguments for cascade analysis of an exported NDJSON file.
 *
 * @internal
 */
export const vajraCascadeArgs = (ndjsonPath: string): ReadonlyArray<string> => [
  "cascade",
  ndjsonPath,
  "--entity-field", "$.fiberId",
  "--time-field", "$.tick",
  "--event-field", "$.action",
  "--response-values", "complete,interrupt",
  "--format", "json",
  "--quiet"
]
