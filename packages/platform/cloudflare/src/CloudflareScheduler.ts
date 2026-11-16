/**
 * Fiber scheduling for applications shared across Cloudflare Worker requests.
 *
 * @stability stable
 * @since 4.2.0
 */
import { waitUntil } from "cloudflare:workers"
import type { Effect } from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"

interface AsyncResource {
  runInAsyncScope<This>(fn: (this: This) => void, thisArg?: This): void
  emitDestroy(): void
}

const AsyncResource: (new(type: string) => AsyncResource) | undefined = (() => {
  try {
    return (globalThis as any).process?.getBuiltinModule?.("node:async_hooks")?.AsyncResource
  } catch {
    return undefined
  }
})()

const compatibilityFlags: Record<string, boolean | undefined> | undefined = (globalThis as any).Cloudflare
  ?.compatibilityFlags

// Entering another request's AsyncResource only fails when AsyncLocalStorage
// snapshots are bound to their request. Otherwise it succeeds in the wrong
// request, so every resumption goes through the owner's promise instead.
const canEnter = AsyncResource !== undefined &&
  compatibilityFlags?.bind_asynclocalstorage_snapshot_to_request !== false

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

// Created in the request a fiber parks in, which owns it. Entering the
// AsyncResource runs the fiber synchronously with the owner's
// AsyncLocalStorage state. workerd refuses that from any other request, so the
// fiber is then handed to a promise the owner created: workerd runs its
// reactions in the owner's IoContext.
//
// The owner waits on that promise with waitUntil, so it keeps running after it
// responds. workerd still cancels a request whose only pending work is a
// promise another request settles, so a timer set in the owner marks the fiber
// as pending work. The owner clears it when the promise settles.
class OwnerResumption implements Scheduler.Resumption {
  readonly resource: AsyncResource | undefined
  readonly settle: (task: () => void) => void
  resumed = false

  constructor() {
    this.resource = AsyncResource === undefined ? undefined : new AsyncResource("effect/Fiber")
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
    // The fiber runs once, with the first entry. An interrupt arriving later
    // is already pending on it.
    if (this.resumed) return
    this.resumed = true
    const resource = this.resource
    if (canEnter) {
      let entered = false
      try {
        resource!.runInAsyncScope(() => {
          entered = true
          fiber.run(effect)
        })
        return this.release()
      } catch (error) {
        if (entered) {
          this.release()
          throw error
        }
      }
    }
    this.settle(() => {
      if (resource === undefined) return fiber.run(effect)
      try {
        resource.runInAsyncScope(() => fiber.run(effect))
      } finally {
        resource.emitDestroy()
      }
    })
  }

  release(): void {
    this.resource!.emitDestroy()
    this.settle(noop)
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
 * waking request continues without waiting for it. Inside a Durable Object,
 * requests share these, so fibers resume immediately.
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
 * throws without it. `AsyncLocalStorage` state is restored with
 * `node:async_hooks`, available with the `nodejs_compat` or `nodejs_als`
 * flags. Without the `bind_asynclocalstorage_snapshot_to_request` flag, enabled
 * by default from 2025-06-16, every resumption is handed to the owner, so fibers
 * woken by their own request also resume a microtask later.
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
   * Records the request a fiber parks in, so it resumes there.
   *
   * @since 4.2.0
   */
  park(): Scheduler.Resumption {
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
