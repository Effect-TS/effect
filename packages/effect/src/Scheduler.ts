/**
 * Controls how runnable Effect fiber tasks are dispatched.
 *
 * A scheduler decides how tasks are queued, when queued tasks run, and when a
 * fiber should pause so other work can continue. This module includes the
 * scheduler service reference, the default `MixedScheduler`, dispatcher types
 * for queued tasks, and references for tuning or disabling automatic scheduler
 * yields.
 *
 * @stability stable
 * @since 2.0.0
 */
import * as Context from "./Context.ts"
import type * as Fiber from "./Fiber.ts"
import {
  defaultMaxOpsBeforeYield,
  defaultPreventSchedulerYield,
  MaxOpsBeforeYieldKey,
  PreventSchedulerYieldKey,
  SchedulerKey
} from "./internal/fiberCachedKeys.ts"

/**
 * A scheduler manages the execution of Effect fibers by controlling when queued
 * tasks run.
 *
 * **When to use**
 *
 * Use to define or provide custom runtime scheduling behavior for Effect fibers.
 *
 * **Details**
 *
 * A scheduler determines the execution mode, schedules tasks with different
 * priorities, and decides when fibers should yield control after consuming
 * their operation budget.
 *
 * @stability stable
 * @category services
 * @since 2.0.0
 */
export interface Scheduler {
  readonly executionMode: "sync" | "async"
  shouldYield(fiber: Fiber.Fiber<unknown, unknown>): boolean
  makeDispatcher(): SchedulerDispatcher
}

/**
 * A dispatcher created by a `Scheduler` for enqueuing tasks and forcing queued
 * tasks to run.
 *
 * **When to use**
 *
 * Use when implementing or testing scheduler-created dispatchers that enqueue
 * prioritized runtime tasks and flush queued work deterministically.
 *
 * **Details**
 *
 * `scheduleTask` queues a task with a priority. `flush` drains pending work
 * synchronously, which is useful when callers need deterministic completion of
 * already scheduled tasks. Lower priority numbers run first, and equal
 * priorities run in FIFO order.
 *
 * @stability stable
 * @category models
 * @since 4.0.0
 */
export interface SchedulerDispatcher {
  scheduleTask(task: () => void, priority: number): void
  flush(): void
}

let defaultScheduler: Scheduler | undefined

/**
 * The scheduler of fibers whose context provides none. `Scheduler` resolves to
 * the same instance, so a fiber and `Context.get` agree on the scheduler in use.
 *
 * @internal
 */
export const getDefaultScheduler = (): Scheduler => (defaultScheduler ??= new MixedScheduler())

/**
 * Context reference for the scheduler used by the Effect runtime.
 *
 * **When to use**
 *
 * Use when you need to replace scheduling behavior globally in tests or runtime
 * setup, such as forcing deterministic task dispatch.
 *
 * **Details**
 *
 * The default value creates a `MixedScheduler`. Provide this service to
 * customize execution mode, task dispatching, or yield behavior.
 *
 * @stability stable
 * @category services
 * @since 2.0.0
 */
export const Scheduler: Context.Reference<Scheduler> = Context.shareDefaultValue(
  Context.Reference<Scheduler>(SchedulerKey, {
    defaultValue: () => new MixedScheduler()
  }),
  getDefaultScheduler
)

// Schedules `f` with `schedule` and returns a function that cancels the run.
const cancellable = (schedule: (run: () => void) => void) => (f: () => void): () => void => {
  let cancelled = false
  schedule(() => {
    if (!cancelled) f()
  })
  return () => {
    cancelled = true
  }
}

const setMicrotask = cancellable((run) => Promise.resolve().then(run))

type TaskScheduler = { readonly postTask?: (task: () => void) => unknown }

// Browsers clamp nested `setTimeout(f, 0)` calls to 4ms, so a fiber that
// yields repeatedly would wait that long on every yield. The Prioritized Task
// Scheduling API queues an unclamped task, in FIFO order with other tasks of
// the same priority.
const postTask = cancellable((run) =>
  (globalThis as { scheduler?: TaskScheduler }).scheduler!.postTask!(() => {
    try {
      run()
    } catch (error) {
      // A throw here would reject the promise `postTask` returns and be
      // reported as an unhandled rejection. Rethrow it from a timer, so it is
      // an uncaught error as it is with `setTimeout`.
      setTimeout(() => {
        throw error
      }, 0)
    }
  })
)

const setTimer: (f: () => void) => () => void = "setImmediate" in globalThis
  ? (f) => {
    // @ts-ignore
    const timer = globalThis.setImmediate(f)
    // @ts-ignore
    return (): void => globalThis.clearImmediate(timer)
  }
  : (f) => {
    if (typeof (globalThis as { scheduler?: TaskScheduler }).scheduler?.postTask === "function") {
      return postTask(f)
    }
    const timer = setTimeout(f, 0)
    return (): void => clearTimeout(timer)
  }

// Some runtimes (e.g. Cloudflare Workers) throw when a timer is set in global
// scope. Fall back to a microtask so effects can still yield at module load.
const setImmediate = (f: () => void) => {
  try {
    return setTimer(f)
  } catch {
    return setMicrotask(f)
  }
}

/**
 * Provides a scheduler implementation that batches queued tasks and dispatches them by
 * priority.
 *
 * **When to use**
 *
 * Use when you need the default runtime scheduler directly, including a
 * scheduler that batches queued work by priority and preserves FIFO order within
 * each priority.
 *
 * **Details**
 *
 * `MixedScheduler` supports synchronous and asynchronous execution modes, uses
 * operation counts to decide when fibers should yield, and is the default
 * scheduler implementation.
 *
 * **Gotchas**
 *
 * On Cloudflare Workers, request-owned scheduler timers can be discarded,
 * leaving shared fibers suspended. Use `new MixedScheduler("sync")` for the
 * whole application; see `HttpRouter.toWebHandler` for a recipe.
 * Sync mode does not yield to the event loop: CPU-heavy work delays other
 * requests, and I/O-polling loops can exhaust the CPU limit. It does not fix
 * request-owned timers (such as `Effect.sleep`) or request-bound async contexts.
 *
 * @stability stable
 * @category models
 * @since 2.0.0
 */
export class MixedScheduler implements Scheduler {
  readonly executionMode: "sync" | "async"
  readonly setImmediate: (f: () => void) => () => void

  constructor(
    executionMode: "sync" | "async" = "async",
    setImmediateFn?: (f: () => void) => () => void
  ) {
    this.executionMode = executionMode
    this.setImmediate = setImmediateFn ?? (executionMode === "sync" ? setMicrotask : setImmediate)
  }

  /**
   * Returns whether the fiber has reached its operation budget and should yield.
   *
   * **When to use**
   *
   * Use to decide whether a fiber should yield after consuming its current
   * operation budget.
   *
   * @since 2.0.0
   */
  shouldYield(fiber: Fiber.Fiber<unknown, unknown>) {
    return fiber.currentOpCount >= fiber.cache.maxOpsBeforeYield
  }

  /**
   * Creates a dispatcher that schedules work through this scheduler.
   *
   * **When to use**
   *
   * Use when you need a standalone dispatcher from a scheduler instance, for
   * example in tests that enqueue tasks and then flush them deterministically.
   *
   * @since 4.0.0
   */
  makeDispatcher() {
    return new MixedSchedulerDispatcher(this.setImmediate)
  }
}

class MixedSchedulerDispatcher implements SchedulerDispatcher {
  // Sorted by priority, each bucket holding its tasks in FIFO order
  private buckets: Array<[priority: number, tasks: Array<() => void>]> = []
  private running: (() => void) | undefined = undefined
  readonly setImmediate: (f: () => void) => () => void

  constructor(setImmediateFn: (f: () => void) => () => void) {
    this.setImmediate = setImmediateFn
  }

  /**
   * @since 2.0.0
   */
  scheduleTask(task: () => void, priority: number) {
    const buckets = this.buckets
    let index = 0
    while (index < buckets.length && buckets[index][0] < priority) index++
    if (index === buckets.length) {
      buckets.push([priority, [task]])
    } else if (buckets[index][0] === priority) {
      buckets[index][1].push(task)
    } else {
      buckets.splice(index, 0, [priority, [task]])
    }
    this.running ??= this.setImmediate(this.afterScheduled)
  }

  /**
   * @since 2.0.0
   */
  afterScheduled = () => {
    this.running = undefined
    this.runTasks()
  }

  /**
   * @since 2.0.0
   */
  runTasks() {
    const buckets = this.buckets
    this.buckets = []
    for (let i = 0; i < buckets.length; i++) {
      const toRun = buckets[i][1]
      for (let j = 0; j < toRun.length; j++) {
        toRun[j]()
      }
    }
  }

  /**
   * @since 2.0.0
   */
  flush() {
    while (this.buckets.length > 0) {
      this.running?.()
      this.running = undefined
      this.runTasks()
    }
  }
}

/**
 * Context reference that controls the maximum number of operations a fiber
 * can perform before yielding control back to the scheduler.
 *
 * **When to use**
 *
 * Use to tune scheduler fairness for CPU-bound fibers by changing the scheduler
 * operation budget that triggers a yield.
 *
 * **Details**
 *
 * The default value is `2048` operations, which balances performance and
 * fairness by helping prevent long-running fibers from monopolizing the
 * execution thread.
 *
 * @see {@link PreventSchedulerYield} for bypassing scheduler yield checks entirely rather than tuning the operation budget
 *
 * @stability stable
 * @category services
 * @since 4.0.0
 */
export const MaxOpsBeforeYield = Context.Reference<number>(MaxOpsBeforeYieldKey, {
  defaultValue: () => defaultMaxOpsBeforeYield
})

/**
 * Context reference that controls whether the runtime should bypass scheduler
 * yield checks. When set to `true`, the fiber run loop won't call
 * `Scheduler.shouldYield`.
 *
 * **When to use**
 *
 * Use to bypass scheduler yield checks for controlled runtime workloads where
 * cooperative yielding should be disabled.
 *
 * **Gotchas**
 *
 * Setting this reference to `true` can let long-running fibers monopolize the
 * JavaScript thread.
 *
 * @see {@link MaxOpsBeforeYield} for tuning yield frequency without disabling yield checks
 * @see {@link Scheduler} for providing custom scheduler yield behavior
 *
 * @stability stable
 * @category services
 * @since 4.0.0
 */
export const PreventSchedulerYield = Context.Reference<boolean>(PreventSchedulerYieldKey, {
  defaultValue: () => defaultPreventSchedulerYield
})
