/**
 * Fiber scheduling for applications shared across Cloudflare Worker requests.
 *
 * @stability stable
 * @since 4.2.0
 */
import { waitUntil } from "cloudflare:workers"
import type { Effect } from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"

const compatibilityFlags: Record<string, boolean | undefined> | undefined = (globalThis as any).Cloudflare
  ?.compatibilityFlags

const noop = (): void => {}

// The longest delay a timer accepts. It only marks pending work, so it is
// cleared before it fires.
const maxTimerMillis = 2_147_483_647

const setPendingTimer = (): ReturnType<typeof setTimeout> | undefined => {
  try {
    return setTimeout(noop, maxTimerMillis)
  } catch {
    // Workers do not allow timers in global scope
    return undefined
  }
}

const keepOwnerAlive = (promise: Promise<void>): void => {
  try {
    waitUntil(promise)
  } catch {
    // Outside a request, for example in global scope, there is no owner to keep
  }
}

// Created in the request a fiber parks in, which owns it. The fiber resumes
// in a reaction to a promise the owner created: workerd runs promise reactions
// in the request that created the promise, with the AsyncLocalStorage state
// they were registered in, so the fiber has the owner's I/O objects, timers
// and store.
//
// The owner waits on that promise with waitUntil, so it keeps running after it
// responds. workerd still cancels a request whose only pending work is a
// promise another request settles, so a timer set in the owner marks the fiber
// as pending work. The owner clears it when the promise settles.
//
// workerd has no way to ask which request is running, so a fiber woken by its
// owner also resumes through the promise, a microtask later.
class OwnerResumption implements Scheduler.Resumption {
  readonly settle: (task: () => void) => void

  constructor() {
    const timer = setPendingTimer()
    let settle!: (task: () => void) => void
    keepOwnerAlive(
      new Promise<() => void>((resolve) => {
        settle = resolve
      }).then((task) => {
        if (timer !== undefined) clearTimeout(timer)
        task()
      })
    )
    this.settle = settle
  }

  resume(fiber: Scheduler.ParkedFiber, effect: Effect<unknown, unknown>): void {
    // Only the first call settles the promise, so the fiber runs once, with the
    // first entry. An interrupt arriving later is already recorded on it.
    this.settle(() => fiber.run(effect))
  }
}

/**
 * A synchronous scheduler that resumes each fiber in the Worker request that
 * owns it, and keeps that request running while the fiber waits.
 *
 * **When to use**
 *
 * Use when fibers or services are shared across requests, for example through
 * a module-scope `ManagedRuntime`, `Deferred`, `Queue`, `PubSub`, or
 * `Semaphore`. Pass an instance as the `scheduler` option to Effect runners.
 * For a shared runtime, build it with
 * `ManagedRuntime.make(AppLayer.pipe(Layer.provideMerge(CloudflareScheduler.layer)))`.
 * Also pass `{ scheduler: new CloudflareScheduler() }` to the runtime runners,
 * including `runFork` and `runPromise`: the layer alone does not configure callers
 * waiting for lazy initialization. To initialize explicitly, run
 * `Effect.runPromise(runtime.contextEffect, { scheduler: new CloudflareScheduler() })`
 * instead of `runtime.context()`, which does not accept a scheduler.
 *
 * **Details**
 *
 * A fiber is owned by the request it last suspended in, or was forked in.
 * When another request wakes or interrupts it, the fiber resumes in its owner,
 * with the owner's `AsyncLocalStorage` state, I/O objects, and timers, and the
 * waking request continues without waiting for it. Every fiber resumes a
 * microtask after it is woken, including one woken by its own request.
 *
 * While a fiber waits, its owner registers the pending resumption with
 * `waitUntil` from `cloudflare:workers` and holds a timer, which counts as
 * pending work. The owner keeps running after it responds, and is not
 * cancelled as hung, until the fiber resumes and the owner clears the timer.
 * The timer never ends or interrupts the fiber. The module imports
 * `cloudflare:workers`, so it only loads in workerd.
 *
 * **Gotchas**
 *
 * This does not extend Cloudflare's request lifetime limits, such as the limit
 * on how long `waitUntil` work may run once the response is sent or the client
 * disconnects. A fiber whose owner has ended can no longer resume: workerd
 * drops the resumption and logs a warning, and the fiber never completes or
 * runs its finalizers. Anything handed to it, such as a `Semaphore` permit or
 * a `Queue` item, is lost.
 *
 * A fiber that is never woken keeps its owner running until those limits end
 * it, and keeps a Durable Object from hibernating. Interrupt fibers that will
 * not be woken, for example with a scope that closes when the request ends.
 *
 * Owner resumption needs the `handle_cross_request_promise_resolution`
 * compatibility flag, enabled by default from 2024-10-14; the constructor
 * throws without it.
 *
 * Synchronous execution does not yield to the event loop, so CPU-heavy work
 * delays other requests.
 *
 * @stability stable
 * @category models
 * @since 4.2.0
 */
export class CloudflareScheduler extends Scheduler.MixedScheduler {
  constructor() {
    super("sync")
    if (compatibilityFlags?.handle_cross_request_promise_resolution === false) {
      throw new Error(
        "CloudflareScheduler requires the handle_cross_request_promise_resolution compatibility flag"
      )
    }
  }

  /**
   * Returns how a parked fiber resumes: in the request it parks in.
   *
   * @since 4.2.0
   */
  override park(_fiber: Fiber.Fiber<unknown, unknown>): Scheduler.Resumption {
    return new OwnerResumption()
  }
}

/**
 * A layer that installs a `CloudflareScheduler` for an application and its
 * fibers.
 *
 * @stability stable
 * @category layers
 * @since 4.2.0
 */
export const layer: Layer.Layer<never> = Layer.sync(Scheduler.Scheduler, () => new CloudflareScheduler())
