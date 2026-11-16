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
import type { Effect } from "./Effect.ts"
import type * as Fiber from "./Fiber.ts"

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
// Existing scheduler APIs remain stable; only the new park contract is unstable.
// @effect-diagnostics-next-line apiStabilityLeak:off
export interface Scheduler {
  readonly executionMode: "sync" | "async"
  shouldYield(fiber: Fiber.Fiber<unknown, unknown>): boolean
  makeDispatcher(): SchedulerDispatcher
  /**
   * Called when a fiber stops running with more to do: it suspended, or it was
   * forked and its start is scheduled. The returned `Resumption` decides where
   * and when the fiber runs next.
   *
   * @stability unstable
   * @since 4.2.0
   */
  park(fiber: Fiber.Fiber<unknown, unknown>): Resumption
}

/**
 * Owns a parked fiber until it runs it, returned by `Scheduler.park`.
 *
 * **When to use**
 *
 * Use to implement `Scheduler.park` for a runtime with its own way of resuming
 * a fiber, such as Cloudflare Workers, where async contexts belong to the
 * request that created them. Other schedulers can delegate to
 * `MixedScheduler.park`.
 *
 * **Details**
 *
 * While a fiber is parked, everything that would make it run again is passed
 * to `resume`: the effect its wait produced, its start, or an interrupt. The
 * resumption runs the fiber once, with the first entry, by calling
 * `fiber.run(effect)`, either synchronously or later, in whatever context it
 * chooses. Entries that arrive before then can be ignored.
 *
 * An interrupt requested while the fiber is parked is recorded on the fiber
 * before it reaches `resume`, the same way as one requested while the fiber
 * is running. The fiber acts on it at its first interruptible step, so it
 * replaces the effect `fiber.run` is called with, and a fork interrupted
 * before it starts never runs.
 *
 * Running the fiber with an entry therefore does not guarantee the entry is
 * delivered. A value woken before an interrupt but run after it is dropped,
 * including a value produced in another request that lands later. A callback
 * that hands a resource to the fiber keeps owning it until the fiber runs, so
 * it needs cancellation cleanup to release a resource that is dropped.
 *
 * **Gotchas**
 *
 * If `fiber.run` is never called, the fiber never resumes and cannot be
 * interrupted.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface Resumption {
  /**
   * Resumes the parked fiber with the selected effect in its scheduler context.
   *
   * @stability unstable
   * @since 4.2.0
   */
  resume(fiber: ParkedFiber, effect: Effect<unknown, unknown>): void
}

/**
 * A parked fiber, as passed to `Resumption.resume`.
 *
 * **Details**
 *
 * `run` runs the fiber synchronously with the given effect, until it parks
 * again or exits. It does nothing once the fiber has exited.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export interface ParkedFiber extends Fiber.Fiber<unknown, unknown> {
  /**
   * Runs the fiber synchronously until it parks again or exits.
   *
   * @stability unstable
   * @since 4.2.0
   */
  run(effect: Effect<unknown, unknown>): void
}

const AsyncResource:
  | (new(type: string) => {
    runInAsyncScope<This, Arg>(fn: (this: This, arg: Arg) => void, thisArg: This, arg: Arg): void
    emitDestroy(): void
  })
  | undefined = (() => {
    try {
      return (globalThis as any).process?.getBuiltinModule?.("node:async_hooks")?.AsyncResource
    } catch {
      return undefined
    }
  })()

// Runs the fiber synchronously in the caller's async context, for runtimes
// without node:async_hooks
const directResumption: Resumption = {
  resume(fiber, effect) {
    fiber.run(effect)
  }
}

// Runs the fiber synchronously in the async context it parked in, restored
// with node:async_hooks. Each one is an async resource for one wait of the
// fiber: when the fiber parks again, it gets a new one.
const AsyncResourceResumption = AsyncResource && class extends AsyncResource implements Resumption {
  resumed = false
  constructor() {
    super("effect/Fiber")
  }
  resume(fiber: ParkedFiber, effect: Effect<unknown, unknown>): void {
    // Only an interrupt can arrive before the first entry has run the fiber,
    // for example from an async_hooks `before` callback, and the fiber has
    // already recorded it
    if (this.resumed) return
    this.resumed = true
    try {
      this.runInAsyncScope(fiber.run, fiber, effect)
    } finally {
      // The wait has ended, even if the run threw, so the resource has no more
      // callbacks to run. Node calls destroy hooks later, so this cannot
      // re-enter the fiber. Without it, async_hooks consumers would see the
      // resource as live until it is garbage collected.
      this.emitDestroy()
    }
  }
}

// Selected once, from the runtime
const makeResumption: () => Resumption = AsyncResourceResumption === undefined
  ? () => directResumption
  : () => new AsyncResourceResumption()

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
export const Scheduler: Context.Reference<Scheduler> = Context.Reference<Scheduler>("effect/Scheduler", {
  fiberCached: true,
  defaultValue: () => new MixedScheduler()
})

const setMicrotask = (f: () => void) => {
  let cancelled = false
  Promise.resolve().then(() => {
    if (!cancelled) f()
  })
  return (): void => {
    cancelled = true
  }
}

const setTimer: (f: () => void) => () => void = "setImmediate" in globalThis
  ? (f) => {
    // @ts-ignore
    const timer = globalThis.setImmediate(f)
    // @ts-ignore
    return (): void => globalThis.clearImmediate(timer)
  }
  : (f) => {
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

class PriorityBuckets {
  buckets: Array<[priority: number, tasks: Array<() => void>]> = []

  scheduleTask(task: () => void, priority: number): void {
    const buckets = this.buckets
    const len = buckets.length
    let bucket: [number, Array<() => void>] | undefined
    let index = 0
    for (; index < len; index++) {
      if (buckets[index][0] > priority) break
      bucket = buckets[index]
    }
    if (bucket && bucket[0] === priority) {
      bucket[1].push(task)
    } else if (index === len) {
      buckets.push([priority, [task]])
    } else {
      buckets.splice(index, 0, [priority, [task]])
    }
  }

  drain() {
    const buckets = this.buckets
    this.buckets = []
    return buckets
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
 * leaving shared fibers suspended, and async contexts cannot be resumed from
 * another request. Use `CloudflareScheduler` from `@effect/platform-cloudflare`
 * for the whole application; it runs in sync mode and resumes each fiber in
 * the request that owns it. Sync mode does not yield to the event loop:
 * CPU-heavy work delays other requests, and I/O-polling loops can exhaust the
 * CPU limit.
 *
 * @stability stable
 * @category models
 * @since 2.0.0
 */
// Existing scheduler APIs remain stable; only the new park contract is unstable.
// @effect-diagnostics-next-line apiStabilityLeak:off
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
  shouldYield(fiber: Fiber.Fiber<unknown, unknown>): boolean {
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
  makeDispatcher(): SchedulerDispatcher {
    return new MixedSchedulerDispatcher(this.setImmediate)
  }

  /**
   * Returns how a parked fiber resumes: synchronously, in the async context it
   * parked in.
   *
   * **Details**
   *
   * Where `node:async_hooks` is available, as in Node.js, Bun and Deno, the
   * fiber resumes inside an `AsyncResource` created where it parked, so
   * `AsyncLocalStorage` state is preserved. Elsewhere, such as in browsers, it
   * resumes in the caller's context. The runtime is detected once, when this
   * module loads.
   *
   * @stability unstable
   * @since 4.2.0
   */
  park(_fiber: Fiber.Fiber<unknown, unknown>): Resumption {
    return makeResumption()
  }
}

class MixedSchedulerDispatcher implements SchedulerDispatcher {
  private tasks = new PriorityBuckets()
  private running: (() => void) | undefined = undefined
  readonly setImmediate: (f: () => void) => () => void

  constructor(
    setImmediateFn: (f: () => void) => () => void = setImmediate
  ) {
    this.setImmediate = setImmediateFn
  }

  /**
   * @since 2.0.0
   */
  scheduleTask(task: () => void, priority: number) {
    this.tasks.scheduleTask(task, priority)
    if (this.running === undefined) {
      this.running = this.setImmediate(this.afterScheduled)
    }
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
    const buckets = this.tasks.drain()
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
    while (this.tasks.buckets.length > 0) {
      if (this.running !== undefined) {
        this.running()
        this.running = undefined
      }
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
export const MaxOpsBeforeYield = Context.Reference<number>("effect/Scheduler/MaxOpsBeforeYield", {
  fiberCached: true,
  defaultValue: () => 2048
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
export const PreventSchedulerYield = Context.Reference<boolean>("effect/Scheduler/PreventSchedulerYield", {
  fiberCached: true,
  defaultValue: () => false
})
