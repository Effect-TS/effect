/**
 * The Cloudflare Workers runtime services for an Effect application: fiber
 * scheduling across requests and tracing in the invocation's Cloudflare trace.
 *
 * @stability unstable
 * @since 4.2.0
 */
import { tracing } from "cloudflare:workers"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"
import * as Tracer from "effect/Tracer"
import { CloudflareScheduler } from "./CloudflareScheduler.ts"
import * as CloudflareTracer from "./CloudflareTracer.ts"

/**
 * A layer that installs `CloudflareScheduler` and `CloudflareTracer` for an
 * application.
 *
 * **When to use**
 *
 * Use with the application layer of a Worker whose fibers or services are
 * shared across requests, such as one using `CloudflareCluster.layer`. Provide
 * it with `Layer.provideMerge`, so the services reach both the layers above it
 * and the context the application runs with. The cluster Durable Object classes
 * run their effects with the context returned by the
 * `CloudflareDurableObjects.setInitializer` callback, so they use the same
 * scheduler and tracer.
 *
 * **Details**
 *
 * Each service is installed only where the Workers runtime supports it, and
 * the Effect default is kept otherwise. The scheduler needs the
 * `handle_cross_request_promise_resolution` compatibility flag. The tracer
 * needs `tracing.withActiveSpan` and `AsyncLocalStorage`; see
 * `CloudflareTracer` for the versions that provide them.
 *
 * To use another tracer, provide `CloudflareScheduler.layer` and that tracer
 * instead of this layer.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const layer: Layer.Layer<never> = Layer.effectContext(Effect.sync(() => {
  let context = Context.empty()
  try {
    context = Context.add(context, Scheduler.Scheduler, new CloudflareScheduler())
  } catch {}
  if (typeof tracing?.startSpan === "function" && typeof tracing.withActiveSpan === "function") {
    try {
      context = Context.add(context, Tracer.Tracer, CloudflareTracer.make())
    } catch {}
  }
  return context
}))
