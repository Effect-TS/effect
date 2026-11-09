/**
 * Where the runtime runs its work: the Scheduler its fibers (Commands,
 * Subscriptions, Layer builds, mounts) use, and how it queues the render flush.
 * `TestHost` swaps in a queue that `settle` drains.
 *
 * @internal
 */
import * as Context from "../../Context.ts"
import type * as Scheduler from "../../Scheduler.ts"

/** @internal */
export interface Executor {
  /** The Scheduler for the runtime's fibers, or `undefined` to keep the caller's. */
  readonly scheduler: Scheduler.Scheduler | undefined
  /** Queues the render flush. */
  readonly schedule: (task: () => void) => void
}

/** @internal */
export const microtask: Executor = {
  scheduler: undefined,
  schedule: (task) => {
    Promise.resolve().then(task)
  }
}

/** @internal */
export const CurrentExecutor = Context.Reference<Executor>("effect/ui/internal/Executor", {
  defaultValue: () => microtask
})

/**
 * One queue for every fiber task and the render flush, ordered by priority
 * and then FIFO. Nothing runs until it's drained.
 *
 * @internal
 */
export class TestExecutor implements Executor, Scheduler.SchedulerDispatcher {
  private tasks: Array<{ readonly task: () => void; readonly priority: number }> = []
  readonly scheduler: Scheduler.Scheduler
  constructor() {
    this.scheduler = {
      executionMode: "sync",
      shouldYield: (fiber) => fiber.currentOpCount >= fiber.cache.maxOpsBeforeYield,
      makeDispatcher: () => this
    }
  }
  schedule(task: () => void): void {
    this.scheduleTask(task, 0)
  }
  scheduleTask(task: () => void, priority: number): void {
    let index = this.tasks.length
    while (index > 0 && this.tasks[index - 1]!.priority > priority) index--
    this.tasks.splice(index, 0, { task, priority })
  }
  flush(): void {
    this.drain(Infinity)
  }
  /** Runs queued tasks, and the tasks they queue, until none are left or the budget runs out. Returns whether it finished. */
  drain(budget: number): boolean {
    let steps = 0
    while (this.tasks.length > 0) {
      if (steps++ >= budget) return false
      this.tasks.shift()!.task()
    }
    return true
  }
  get size(): number {
    return this.tasks.length
  }
}
