/**
 * The scheduler and tracer the package's layers provide by default.
 *
 * `CloudflareScheduler` and `CloudflareTracer` import `cloudflare:workers`,
 * which only resolves in workerd. The layers also load in Node (tests, Alchemy
 * plan time), so the two modules are imported when the layer is built.
 *
 * @internal
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"
import * as Tracer from "effect/Tracer"

const loadWorkers = (): Promise<any> => import("cloudflare:workers")

const load = () =>
  Promise.all([
    loadWorkers(),
    import("../CloudflareScheduler.ts"),
    import("../CloudflareTracer.ts")
  ]).catch(() => undefined)

/**
 * Provides `CloudflareScheduler` and `CloudflareTracer` where the runtime
 * supports them, unless the layer is built with one already provided.
 *
 * @internal
 */
export const layer: Layer.Layer<never> = Layer.effectContext(Effect.gen(function*() {
  const ambient = yield* Effect.context<never>()
  let context = Context.empty()
  const modules = yield* Effect.promise(load)
  if (modules === undefined) return context
  const [Workers, CloudflareScheduler, CloudflareTracer] = modules
  if (Context.getOrUndefinedUnsafe(ambient, Scheduler.Scheduler.key) === undefined) {
    try {
      context = Context.add(context, Scheduler.Scheduler, new CloudflareScheduler.CloudflareScheduler())
    } catch {}
  }
  const tracing = Workers.tracing
  if (
    Context.getOrUndefinedUnsafe(ambient, Tracer.TracerKey) === undefined &&
    typeof tracing?.startSpan === "function" && typeof tracing.withActiveSpan === "function"
  ) {
    try {
      context = Context.add(context, Tracer.Tracer, CloudflareTracer.make())
    } catch {}
  }
  return context
}))
