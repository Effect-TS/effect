/**
 * Fiber scheduling for applications shared across Cloudflare Worker requests.
 *
 * @stability stable
 * @since 4.2.0
 */
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"

/**
 * A synchronous scheduler that does not capture request-bound native async contexts.
 *
 * **When to use**
 *
 * Use when fibers or services are shared across
 * requests. Pass an instance as the `scheduler` option to Effect runners, or
 * build a shared runtime with
 * `ManagedRuntime.make(AppLayer.pipe(Layer.provideMerge(CloudflareScheduler.layer)))`.
 * Install it before starting fibers, including those created while building layers.
 *
 * **Gotchas**
 *
 * Native AsyncLocalStorage state is not preserved across suspension or deferred
 * forks; a continuation uses the context that resumes it. Synchronous execution
 * does not yield to the event loop, so CPU-heavy work delays other requests.
 * This does not make request-owned I/O or timers such as `Effect.sleep` portable
 * across requests.
 *
 * @stability stable
 * @category models
 * @since 4.2.0
 */
export class CloudflareScheduler extends Scheduler.MixedScheduler {
  readonly preserveAsyncContext = false

  constructor() {
    super("sync")
  }
}

/**
 * Layer that installs the Cloudflare scheduler for an application and its fibers.
 *
 * @stability stable
 * @category layers
 * @since 4.2.0
 */
export const layer: Layer.Layer<never> = Layer.succeed(Scheduler.Scheduler, new CloudflareScheduler())
