/**
 * Fiber scheduling for applications shared across Cloudflare Worker requests.
 *
 * @stability unstable
 * @since 4.2.0
 */
import { waitUntil } from "cloudflare:workers"
import type { Effect } from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"

/**
 * A scheduler that resumes each fiber in the Worker request that owns it, and
 * keeps that request running while the fiber waits.
 *
 * **When to use**
 *
 * Use when fibers or services are shared across requests, for example through
 * a module-scope `ManagedRuntime`, `Deferred`, `Queue`, `PubSub`, or
 * `Semaphore`. Pass an instance as the `scheduler` option to Effect runners.
 * For a shared `ManagedRuntime`, opt in with
 * `AppLayer.pipe(Layer.provideMerge(CloudflareRuntime.layer))` to include the
 * Cloudflare tracer as well. To keep another tracer, provide this module's
 * `layer` alongside your tracer layer instead.
 *
 * **Details**
 *
 * A fiber is owned by the request it last suspended in, or was forked in.
 * When another request wakes or interrupts it, the fiber resumes in its owner,
 * with the owner's `AsyncLocalStorage` state, I/O objects, and timers, and the
 * waking request continues without waiting for it. Every fiber resumes a
 * microtask after it is woken, including one woken by its own request, so the
 * scheduler's `executionMode` is `"async"`. Other queued work, such as a
 * fiber that yields or a forked fiber's start, is dispatched like
 * `MixedScheduler`'s, and the fiber parks until it runs.
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
 * A scheduler in the built context does not configure callers waiting for lazy
 * `ManagedRuntime` initialization. Pass `{ scheduler: new CloudflareScheduler() }`
 * to `runFork` or `runPromise` if requests may race the build. For explicit
 * initialization with this scheduler, use
 * `Effect.runPromise(runtime.contextEffect, { scheduler: new CloudflareScheduler() })`;
 * `runtime.context()` does not accept a scheduler option.
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
 * When `Fiber.setContext` gives a suspended fiber another scheduler, only the
 * fiber's next run is in its owner. It uses the other scheduler from then on:
 * unless that scheduler parks too, a later wait is not returned to the owner
 * and does not keep the owner running, so it may fail or never complete.
 *
 * @stability unstable
 * @category models
 * @since 4.2.0
 */
export class CloudflareScheduler extends Scheduler.MixedScheduler implements Scheduler.ParkingScheduler {
  /**
   * Marks the scheduler as a `ParkingScheduler`.
   *
   * @stability unstable
   * @since 4.2.0
   */
  readonly [Scheduler.ParkingSchedulerTypeId] = Scheduler.ParkingSchedulerTypeId

  /**
   * Creates a scheduler for request-owned fiber resumption.
   *
   * @stability unstable
   * @since 4.2.0
   */
  constructor() {
    super("async")
    if (compatibilityFlags?.handle_cross_request_promise_resolution === false) {
      throw new Error(
        "CloudflareScheduler requires the handle_cross_request_promise_resolution compatibility flag"
      )
    }
  }

  /**
   * Makes the current request the owner of a parked fiber.
   *
   * @stability unstable
   * @since 4.2.0
   */
  park(fiber: Scheduler.ParkedFiber): void {
    let timer: ReturnType<typeof setTimeout> | undefined
    const resumed = new Promise<() => void>((resolve) => {
      waits.set(fiber, resolve)
    }).then((run) => {
      clearTimeout(timer)
      waits.delete(fiber)
      run()
    })
    try {
      // workerd cancels a request whose only pending work is a promise that
      // another request settles. A timer is pending work, so this one marks
      // the fiber. It has the longest delay a timer accepts and never fires.
      timer = setTimeout(noop, 2_147_483_647)
      waitUntil(resumed)
    } catch {
      // Workers allow neither in global scope, where no request owns the fiber
    }
  }

  /**
   * Runs a parked fiber in the request that owns it.
   *
   * @stability unstable
   * @since 4.2.0
   */
  resume(fiber: Scheduler.ParkedFiber, effect: Effect<unknown, unknown>): void {
    const settle = waits.get(fiber)
    if (settle === undefined) return fiber.run(effect)
    // A promise settles once, so only the first effect runs the fiber
    settle(() => fiber.run(effect))
  }
}

/**
 * A layer that installs a `CloudflareScheduler` for an application and its
 * fibers.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const layer: Layer.Layer<never> = Layer.sync(Scheduler.Scheduler, () => new CloudflareScheduler())

// -----------------------------------------------------------------------------
// Internal
// -----------------------------------------------------------------------------

const compatibilityFlags: Record<string, boolean | undefined> | undefined = (globalThis as any).Cloudflare
  ?.compatibilityFlags

// Each parked fiber waits on a promise created in the request it parked in,
// kept here by the function that settles it. workerd runs the reactions of a
// promise in the request that created it, with the AsyncLocalStorage state
// they were registered in, so settling it from any request runs the fiber in
// its owner. workerd cannot tell which request is running, so a fiber woken by
// its owner takes the same path, a microtask later.
const waits = new WeakMap<Scheduler.ParkedFiber, (run: () => void) => void>()

const noop = (): void => {}
