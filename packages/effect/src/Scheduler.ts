/**
 * @since 2.0.0
 */

import type { Effect } from "./Effect.js"
import type { RuntimeFiber } from "./Fiber.js"
import type { FiberRef } from "./FiberRef.js"
import { dual } from "./Function.js"
import { globalValue } from "./GlobalValue.js"
import * as Hash from "./Hash.js"
import * as core from "./internal/core.js"
import * as Utils from "./Utils.js"

/**
 * @since 2.0.0
 * @category models
 */
export type Task = () => void

/**
 * @since 2.0.0
 * @category models
 */
export interface Scheduler {
  shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false
  scheduleTask(task: Task, priority: number): void
}

/**
 * @since 2.0.0
 * @category utils
 */
export class PriorityBuckets<in out T = Task> {
  /**
   * @since 2.0.0
   */
  public buckets: Array<[number, Array<T>]> = []
  /**
   * @since 2.0.0
   */
  scheduleTask(task: T, priority: number) {
    const length = this.buckets.length
    let bucket: [number, Array<T>] | undefined = undefined
    let index = 0
    for (; index < length; index++) {
      if (this.buckets[index][0] <= priority) {
        bucket = this.buckets[index]
      } else {
        break
      }
    }
    if (bucket && bucket[0] === priority) {
      bucket[1].push(task)
    } else if (index === length) {
      this.buckets.push([priority, [task]])
    } else {
      this.buckets.splice(index, 0, [priority, [task]])
    }
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export class MixedScheduler implements Scheduler {
  /**
   * @since 2.0.0
   */
  running = false
  /**
   * @since 2.0.0
   */
  tasks = new PriorityBuckets()

  constructor(
    /**
     * @since 2.0.0
     */
    readonly maxNextTickBeforeTimer: number
  ) {}

  /**
   * @since 2.0.0
   */
  private starveInternal(depth: number) {
    const tasks = this.tasks.buckets
    this.tasks.buckets = []
    for (const [_, toRun] of tasks) {
      for (let i = 0; i < toRun.length; i++) {
        toRun[i]()
      }
    }
    if (this.tasks.buckets.length === 0) {
      this.running = false
    } else {
      this.starve(depth)
    }
  }

  /**
   * @since 2.0.0
   */
  private starve(depth = 0) {
    if (depth >= this.maxNextTickBeforeTimer) {
      setTimeout(() => this.starveInternal(0), 0)
    } else {
      Promise.resolve(void 0).then(() => this.starveInternal(depth + 1))
    }
  }

  /**
   * @since 2.0.0
   */
  shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false {
    return fiber.currentOpCount > fiber.getFiberRef(core.currentMaxOpsBeforeYield)
      ? fiber.getFiberRef(core.currentSchedulingPriority)
      : false
  }

  /**
   * @since 2.0.0
   */
  scheduleTask(task: Task, priority: number) {
    this.tasks.scheduleTask(task, priority)
    if (!this.running) {
      this.running = true
      this.starve()
    }
  }
}

/**
 * @since 2.0.0
 * @category schedulers
 */
export const defaultScheduler: Scheduler = globalValue(
  Symbol.for("effect/Scheduler/defaultScheduler"),
  () => new MixedScheduler(2048)
)

/**
 * @since 2.0.0
 * @category constructors
 */
export class SyncScheduler implements Scheduler {
  /**
   * @since 2.0.0
   */
  tasks = new PriorityBuckets()

  /**
   * @since 2.0.0
   */
  deferred = false

  /**
   * @since 2.0.0
   */
  scheduleTask(task: Task, priority: number) {
    if (this.deferred) {
      defaultScheduler.scheduleTask(task, priority)
    } else {
      this.tasks.scheduleTask(task, priority)
    }
  }

  /**
   * @since 2.0.0
   */
  shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false {
    return fiber.currentOpCount > fiber.getFiberRef(core.currentMaxOpsBeforeYield)
      ? fiber.getFiberRef(core.currentSchedulingPriority)
      : false
  }

  /**
   * @since 2.0.0
   */
  flush() {
    while (this.tasks.buckets.length > 0) {
      const tasks = this.tasks.buckets
      this.tasks.buckets = []
      for (const [_, toRun] of tasks) {
        for (let i = 0; i < toRun.length; i++) {
          toRun[i]()
        }
      }
    }
    this.deferred = true
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export class ControlledScheduler implements Scheduler {
  /**
   * @since 2.0.0
   */
  tasks = new PriorityBuckets()

  /**
   * @since 2.0.0
   */
  deferred = false

  /**
   * @since 2.0.0
   */
  scheduleTask(task: Task, priority: number) {
    if (this.deferred) {
      defaultScheduler.scheduleTask(task, priority)
    } else {
      this.tasks.scheduleTask(task, priority)
    }
  }

  /**
   * @since 2.0.0
   */
  shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false {
    return fiber.currentOpCount > fiber.getFiberRef(core.currentMaxOpsBeforeYield)
      ? fiber.getFiberRef(core.currentSchedulingPriority)
      : false
  }

  /**
   * @since 2.0.0
   */
  step() {
    const tasks = this.tasks.buckets
    this.tasks.buckets = []
    for (const [_, toRun] of tasks) {
      for (let i = 0; i < toRun.length; i++) {
        toRun[i]()
      }
    }
  }
}

/**
 * Same as `MixedScheduler`, but performs tasks with the same priority randomly
 *
 * It is useful in scenarios where you want to introduce non-deterministic behavior in task execution while still
 * ensuring that higher-priority tasks are generally executed before lower-priority ones.
 * Uses a Pseudo-Random Number Generator (PRNG) for selecting the next task to execute within a tasks with the same priority.
 * `RandomScheduler` can be seeded for reproducibility.
 *
 * @see MixedScheduler
 * @since 3.6.4
 * @category constructors
 */
export class RandomScheduler implements Scheduler {
  /**
   * @since 3.6.4
   */
  running = false
  /**
   * @since 3.6.4
   */
  readonly tasks = new PriorityBuckets()
  /**
   * @since 3.6.4
   */
  readonly maxNextTickBeforeTimer: number
  /**
   * @since 3.6.4
   */
  readonly PRNG: Utils.PCGRandom

  constructor(
    options?: {
      /**
       * @since 3.6.4
       */
      readonly seed?: unknown
      /**
       * @since 3.6.4
       */
      readonly maxNextTickBeforeTimer?: number | undefined
    } | undefined
  ) {
    this.maxNextTickBeforeTimer = options?.maxNextTickBeforeTimer ?? 2048
    this.PRNG = new Utils.PCGRandom(Hash.hash((options?.seed === undefined) ? Math.random() : options.seed))
  }

  /**
   * @since 3.6.4
   */
  private starveInternal(depth: number) {
    const tasks = this.tasks.buckets
    this.tasks.buckets = []
    for (const [_, toRun] of tasks) {
      while (toRun.length) {
        const randomIndex = this.PRNG.integer(toRun.length)
        const task = toRun.splice(randomIndex, 1)[0]
        task()
      }
    }
    if (this.tasks.buckets.length === 0) {
      this.running = false
    } else {
      this.starve(depth)
    }
  }

  /**
   * @since 3.6.4
   */
  private starve(depth = 0) {
    if (depth >= this.maxNextTickBeforeTimer) {
      setTimeout(() => this.starveInternal(0), 0)
    } else {
      Promise.resolve(void 0).then(() => this.starveInternal(depth + 1))
    }
  }

  /**
   * @since 3.6.4
   */
  shouldYield(fiber: RuntimeFiber<unknown, unknown>) {
    return defaultShouldYield(fiber)
  }

  /**
   * @since 3.6.4
   */
  scheduleTask(task: Task, priority: number) {
    this.tasks.scheduleTask(task, priority)
    if (!this.running) {
      this.running = true
      this.starve()
    }
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeMatrix = (...record: Array<[number, Scheduler]>): Scheduler => {
  const index = record.sort(([p0], [p1]) => p0 < p1 ? -1 : p0 > p1 ? 1 : 0)
  return {
    shouldYield(fiber) {
      for (const scheduler of record) {
        const priority = scheduler[1].shouldYield(fiber)
        if (priority !== false) {
          return priority
        }
      }
      return false
    },
    scheduleTask(task, priority) {
      let scheduler: Scheduler | undefined = undefined
      for (const i of index) {
        if (priority >= i[0]) {
          scheduler = i[1]
        } else {
          return (scheduler ?? defaultScheduler).scheduleTask(task, priority)
        }
      }
      return (scheduler ?? defaultScheduler).scheduleTask(task, priority)
    }
  }
}

/**
 * @since 2.0.0
 * @category utilities
 */
export const defaultShouldYield: Scheduler["shouldYield"] = (fiber) => {
  return fiber.currentOpCount > fiber.getFiberRef(core.currentMaxOpsBeforeYield)
    ? fiber.getFiberRef(core.currentSchedulingPriority)
    : false
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make = (
  scheduleTask: Scheduler["scheduleTask"],
  shouldYield: Scheduler["shouldYield"] = defaultShouldYield
): Scheduler => ({
  scheduleTask,
  shouldYield
})

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeBatched = (
  callback: (runBatch: () => void) => void,
  shouldYield: Scheduler["shouldYield"] = defaultShouldYield
) => {
  let running = false
  const tasks = new PriorityBuckets()
  const starveInternal = () => {
    const tasksToRun = tasks.buckets
    tasks.buckets = []
    for (const [_, toRun] of tasksToRun) {
      for (let i = 0; i < toRun.length; i++) {
        toRun[i]()
      }
    }
    if (tasks.buckets.length === 0) {
      running = false
    } else {
      starve()
    }
  }

  const starve = () => callback(starveInternal)

  return make((task, priority) => {
    tasks.scheduleTask(task, priority)
    if (!running) {
      running = true
      starve()
    }
  }, shouldYield)
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const timer = (ms: number, shouldYield: Scheduler["shouldYield"] = defaultShouldYield) =>
  make((task) => setTimeout(task, ms), shouldYield)

/**
 * @since 2.0.0
 * @category constructors
 */
export const timerBatched = (ms: number, shouldYield: Scheduler["shouldYield"] = defaultShouldYield) =>
  makeBatched((task) => setTimeout(task, ms), shouldYield)

/** @internal */
export const currentScheduler: FiberRef<Scheduler> = globalValue(
  Symbol.for("effect/FiberRef/currentScheduler"),
  () => core.fiberRefUnsafeMake(defaultScheduler)
)

/** @internal */
export const withScheduler = dual<
  (scheduler: Scheduler) => <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>,
  <A, E, R>(self: Effect<A, E, R>, scheduler: Scheduler) => Effect<A, E, R>
>(2, (self, scheduler) => core.fiberRefLocally(self, currentScheduler, scheduler))
