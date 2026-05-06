/**
 * DSTScheduler - Deterministic Simulation Testing Scheduler for Effect.
 *
 * Uses a seeded PCG PRNG to deterministically choose which pending task to
 * execute next. Given the same seed, execution order is always identical,
 * enabling reproducible concurrency testing.
 *
 * @internal
 */

import type { RuntimeFiber } from "../../Fiber.js"
import type { Scheduler, Task } from "../../Scheduler.js"
import { PCGRandom, type PCGRandomState } from "../../Utils.js"
import * as EventLog from "./eventLog.js"

/** @internal */
export interface PendingTask {
  readonly task: Task
  readonly priority: number
  readonly fiberId: number
}

/** @internal */
export interface DSTSnapshot {
  readonly prngState: PCGRandomState
  readonly pendingCount: number
  readonly tick: number
}

/** @internal */
export interface DSTSchedulerConfig {
  readonly seed: number
  readonly maxOpsBeforeYield?: number
  readonly maxSteps?: number
}

/** @internal */
export interface DSTScheduler extends Scheduler {
  /** Execute one randomly-chosen pending task. Returns false if no tasks pending. */
  step(): boolean
  /** Run step() in a loop until no tasks remain or maxSteps is reached. Returns total steps executed. */
  stepUntilDone(): number
  /** Whether there are pending tasks. */
  hasPending(): boolean
  /** Get the event log for replay/debugging. */
  getEventLog(): EventLog.DSTEventLog
  /** Capture PRNG state for snapshot/restore. */
  snapshot(): DSTSnapshot
  /** Restore from a previous snapshot. */
  restore(snapshot: DSTSnapshot): void
  /** The seed this scheduler was created with. */
  readonly seed: number
  /** The current tick (number of steps executed). */
  readonly tick: number
  /** The max steps before stepUntilDone stops. */
  readonly maxSteps: number
}

/** @internal */
export const make = (config: DSTSchedulerConfig): DSTScheduler => {
  const prng = new PCGRandom(config.seed)
  const pending: Array<PendingTask> = []
  const eventLog = EventLog.make(config.seed)
  const maxOpsBeforeYield = config.maxOpsBeforeYield ?? 2048
  const maxSteps = config.maxSteps ?? 100_000

  let tick = 0
  let _executing = false

  // Per-fiber pending task count — used to detect fiber completion.
  // When a fiber's count drops to 0 after execution and no new tasks
  // were scheduled for it, the fiber has completed.
  const fiberPendingCount = new Map<number, number>()

  const incFiberPending = (fiberId: number) => {
    fiberPendingCount.set(fiberId, (fiberPendingCount.get(fiberId) ?? 0) + 1)
  }

  const decFiberPending = (fiberId: number) => {
    const count = (fiberPendingCount.get(fiberId) ?? 1) - 1
    if (count <= 0) {
      fiberPendingCount.delete(fiberId)
    } else {
      fiberPendingCount.set(fiberId, count)
    }
  }

  const scheduler: DSTScheduler = {
    seed: config.seed,

    get tick() {
      return tick
    },

    get maxSteps() {
      return maxSteps
    },

    shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false {
      if (fiber.currentOpCount > maxOpsBeforeYield) {
        return 0
      }
      return false
    },

    scheduleTask(task: Task, priority: number, fiber?: RuntimeFiber<unknown, unknown>): void {
      const fiberId = fiber ? (fiber as any).id().id ?? -1 : -1
      pending.push({ task, priority, fiberId })
      incFiberPending(fiberId)

      eventLog.append({
        tick,
        action: "schedule",
        fiberId,
        priority,
        chosenIndex: -1,
        pendingCount: pending.length
      })
    },

    step(): boolean {
      if (pending.length === 0) {
        return false
      }

      // Use PRNG to pick which task to execute next
      const index = pending.length === 1 ? 0 : prng.integer(pending.length)
      const chosen = pending[index]!

      // Remove the chosen task from pending
      pending.splice(index, 1)
      decFiberPending(chosen.fiberId)

      eventLog.append({
        tick,
        action: "execute",
        fiberId: chosen.fiberId,
        priority: chosen.priority,
        chosenIndex: index,
        pendingCount: pending.length
      })

      // Track the pending count for this fiber BEFORE execution
      const fiberPendingBefore = fiberPendingCount.get(chosen.fiberId) ?? 0

      tick++

      // Execute the task. This may cause new tasks to be scheduled.
      _executing = true
      try {
        chosen.task()
      } finally {
        _executing = false
      }

      // Check if this fiber completed: it had no pending tasks before
      // execution, and still has none after (no new tasks were scheduled for it)
      const fiberPendingAfter = fiberPendingCount.get(chosen.fiberId) ?? 0
      if (fiberPendingBefore === 0 && fiberPendingAfter === 0) {
        eventLog.append({
          tick,
          action: "complete",
          fiberId: chosen.fiberId,
          priority: chosen.priority,
          chosenIndex: -1,
          pendingCount: pending.length
        })
      }

      return true
    },

    stepUntilDone(): number {
      let steps = 0
      while (pending.length > 0 && steps < maxSteps) {
        scheduler.step()
        steps++
      }
      return steps
    },

    hasPending(): boolean {
      return pending.length > 0
    },

    getEventLog(): EventLog.DSTEventLog {
      return eventLog
    },

    snapshot(): DSTSnapshot {
      return {
        prngState: prng.getState(),
        pendingCount: pending.length,
        tick
      }
    },

    restore(snap: DSTSnapshot): void {
      prng.setState(snap.prngState)
      tick = snap.tick
    }
  }

  return scheduler
}
