/**
 * Fiber scheduling for applications shared across Cloudflare Worker requests.
 *
 * @stability stable
 * @since 4.2.0
 */
import * as Duration from "effect/Duration"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"

const AsyncResource: (new(type: string) => Scheduler.AsyncContext) | undefined = (() => {
  try {
    return (globalThis as any).process?.getBuiltinModule?.("node:async_hooks")?.AsyncResource
  } catch {
    return undefined
  }
})()

const defaultKeepAliveMillis = 30_000
// Longer delays overflow to an immediate timer
const maxTimerMillis = 2_147_483_647

const run = (task: () => void): void => task()
const noop = (): void => {}

const setKeepAlive = (millis: number): unknown => {
  try {
    return setTimeout(noop, millis)
  } catch {
    // Workers do not allow timers in global scope
    return undefined
  }
}

// Captured in the request a fiber suspends or is forked in, which owns it.
// Entering the AsyncResource resumes the fiber synchronously with the owner's
// AsyncLocalStorage state. workerd refuses that from any other request, so the
// resumption is then handed to a promise the owner created: workerd runs its
// reactions in the owner's IoContext, or drops them if the owner has ended.
class RequestContext implements Scheduler.AsyncContext {
  readonly resource: Scheduler.AsyncContext
  readonly resolve: (task: () => void) => void
  // Keeps the owner from being cancelled as hung while the fiber waits. Timers
  // belong to the request that set them, so only the owner clears it.
  readonly timer: unknown

  constructor(Resource: new(type: string) => Scheduler.AsyncContext, keepAliveMillis: number | undefined) {
    this.resource = new Resource("effect/Fiber")
    let resolve!: (task: () => void) => void
    new Promise<() => void>((resolve_) => {
      resolve = resolve_
    }).then(run)
    this.resolve = resolve
    this.timer = keepAliveMillis === undefined ? undefined : setKeepAlive(keepAliveMillis)
  }

  runInAsyncScope<This, Arg>(fn: (this: This, arg: Arg) => void, thisArg: This, arg: Arg): void {
    let entered = false
    try {
      this.resource.runInAsyncScope(
        () => {
          entered = true
          this.clearKeepAlive()
          fn.call(thisArg, arg)
        },
        undefined,
        undefined
      )
    } catch (error) {
      if (entered) throw error
      this.resolve(() => {
        this.clearKeepAlive()
        fn.call(thisArg, arg)
      })
    }
  }

  clearKeepAlive(): void {
    if (this.timer !== undefined) clearTimeout(this.timer as any)
  }

  emitDestroy(): void {
    this.resource.emitDestroy()
  }
}

/**
 * A synchronous scheduler that resumes each fiber in the Worker request that
 * owns it.
 *
 * **When to use**
 *
 * Use when fibers or services are shared across requests, for example through
 * a module-scope `ManagedRuntime`, `Deferred`, `Queue`, `PubSub`, or
 * `Semaphore`. Pass an instance as the `scheduler` option to Effect runners.
 * For a shared runtime, build it with
 * `ManagedRuntime.make(AppLayer.pipe(Layer.provideMerge(CloudflareScheduler.layer())))`.
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
 * While a fiber waits, a timer keeps workerd from cancelling its owner as hung
 * for up to `keepAlive` (30 seconds by default). Without it, a request that
 * awaits only work another request will finish is cancelled, because a pending
 * promise does not count as pending work. The timer does not extend a request
 * that has already responded; use `ctx.waitUntil` for that. Pass
 * `keepAlive: false` to disable it.
 *
 * **Gotchas**
 *
 * A fiber whose owner has ended cannot resume: workerd drops the resumption and
 * logs a warning, and the fiber never completes or runs its finalizers.
 * Anything handed to it, such as a `Semaphore` permit or a `Queue` item, is
 * lost. Keep the owner alive with `ctx.waitUntil` while its fibers may still
 * be woken, or interrupt them before it ends.
 *
 * Owner resumption needs `node:async_hooks`, available with the `nodejs_compat`
 * or `nodejs_als` compatibility flags, or a compatibility date of 2026-08-15 or
 * later. Without it, fibers resume in the request that wakes them, and the
 * owner's I/O objects cannot be used there.
 *
 * In a Durable Object, the keep-alive timer delays hibernation; consider
 * `keepAlive: false` there. Synchronous execution does not yield to the event
 * loop, so CPU-heavy work delays other requests.
 *
 * @stability stable
 * @category models
 * @since 4.2.0
 */
export class CloudflareScheduler extends Scheduler.MixedScheduler {
  readonly keepAliveMillis: number | undefined

  constructor(options?: {
    /**
     * How long a waiting fiber keeps its owner request alive, or `false` to
     * not keep it alive.
     *
     * @default "30 seconds"
     */
    readonly keepAlive?: Duration.Input | false | undefined
  }) {
    super("sync")
    const keepAlive = options?.keepAlive
    this.keepAliveMillis = keepAlive === false
      ? undefined
      : keepAlive === undefined
      ? defaultKeepAliveMillis
      : Math.min(Duration.toMillis(Duration.fromInputUnsafe(keepAlive)), maxTimerMillis)
  }

  /**
   * Captures the request a fiber suspends or is forked in, so it resumes there.
   *
   * @since 4.2.0
   */
  captureAsyncContext(): Scheduler.AsyncContext | undefined {
    return AsyncResource === undefined ? undefined : new RequestContext(AsyncResource, this.keepAliveMillis)
  }
}

/**
 * Creates a layer that installs a `CloudflareScheduler` for an application and
 * its fibers.
 *
 * @stability stable
 * @category layers
 * @since 4.2.0
 */
export const layer = (options?: {
  readonly keepAlive?: Duration.Input | false | undefined
}): Layer.Layer<never> => Layer.succeed(Scheduler.Scheduler, new CloudflareScheduler(options))
