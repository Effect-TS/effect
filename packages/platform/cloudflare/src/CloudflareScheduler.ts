/**
 * Fiber scheduling for applications shared across Cloudflare Worker requests.
 *
 * @stability stable
 * @since 4.2.0
 */
import { waitUntil } from "cloudflare:workers"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"

const AsyncResource: (new(type: string) => Scheduler.AsyncContext) | undefined = (() => {
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

const run = (task: () => void): void => task()
const noop = (): void => {}

const keepOwnerAlive = (promise: Promise<void>): void => {
  try {
    waitUntil(promise)
  } catch {
    // Outside a request, for example in global scope, there is no owner to keep
  }
}

// Captured in the request a fiber suspends or is forked in, which owns it.
// Entering the AsyncResource resumes the fiber synchronously with the owner's
// AsyncLocalStorage state. workerd refuses that from any other request, so the
// resumption is then handed to a promise the owner created: workerd runs its
// reactions in the owner's IoContext. The owner waits on that promise, so it
// stays alive after responding until the fiber resumes.
class OwnerContext implements Scheduler.AsyncContext {
  readonly resource: Scheduler.AsyncContext | undefined
  readonly resolve: (task: () => void) => void

  constructor() {
    this.resource = AsyncResource === undefined ? undefined : new AsyncResource("effect/Fiber")
    let resolve!: (task: () => void) => void
    keepOwnerAlive(
      new Promise<() => void>((resolve_) => {
        resolve = resolve_
      }).then(run)
    )
    this.resolve = resolve
  }

  runInAsyncScope<This, Arg>(fn: (this: This, arg: Arg) => void, thisArg: This, arg: Arg): void {
    const resource = this.resource
    if (canEnter) {
      let entered = false
      try {
        resource!.runInAsyncScope(
          () => {
            entered = true
            fn.call(thisArg, arg)
          },
          undefined,
          undefined
        )
        return this.resolve(noop)
      } catch (error) {
        if (entered) {
          this.resolve(noop)
          throw error
        }
      }
    }
    this.resolve(() => resource === undefined ? fn.call(thisArg, arg) : resource.runInAsyncScope(fn, thisArg, arg))
  }

  emitDestroy(): void {
    this.resource?.emitDestroy()
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
 * Each waiting fiber is registered with its owner through `waitUntil` from
 * `cloudflare:workers`, so the owner keeps running after it responds until
 * the fiber resumes. The module imports `cloudflare:workers`, so it only loads
 * in workerd.
 *
 * **Gotchas**
 *
 * workerd cancels a request once nothing it waits on can make progress, and
 * another request's fibers do not count. Then:
 *
 * - A request that only waits on another request's work, such as a shared
 *   runtime's initialization, fails as hung. Give it work of its own to wait on.
 * - A fiber whose owner was cancelled, or has finished after responding, can no
 *   longer resume. workerd drops the resumption and logs a warning, and the
 *   fiber never completes or runs its finalizers. Anything handed to it, such
 *   as a `Semaphore` permit or a `Queue` item, is lost. Interrupt such fibers
 *   before their owner runs out of work.
 *
 * `waitUntil` work is also subject to the platform's limit on how long a
 * request may run after responding.
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
   * Captures the request a fiber suspends or is forked in, so it resumes there.
   *
   * @since 4.2.0
   */
  captureAsyncContext(): Scheduler.AsyncContext {
    return new OwnerContext()
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
