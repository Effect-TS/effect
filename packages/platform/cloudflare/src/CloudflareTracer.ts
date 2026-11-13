/**
 * Records Effect spans in the trace Cloudflare Workers already collects for
 * each invocation, using the Workers custom spans API (`tracing` from
 * `cloudflare:workers`, or `ctx.tracing`).
 *
 * Effect spans become Cloudflare spans in the invocation's trace, and the spans
 * the runtime creates for `fetch` and binding calls nest under the Effect span
 * that made them. Cloudflare exports the trace to the OpenTelemetry destinations
 * configured for the account, so there is no endpoint, exporter, or flush to
 * configure. Enable traces in the Wrangler configuration
 * (`observability.traces.enabled`) for spans to be recorded.
 *
 * Use `Otlp.layer` with `FetchHttpClient` instead to send a separate trace
 * from the Worker to your own OTLP endpoint.
 *
 * **Compatibility**
 *
 * The tracer needs `tracing.startSpan` and `tracing.withActiveSpan`.
 * `withActiveSpan` is newer than Cloudflare's custom spans documentation: it
 * shipped in workerd `1.20261113.1`, and `@cloudflare/workers-types` types it
 * from `5.20261107.1`. Local development needs a Wrangler or Miniflare release
 * that bundles that workerd or later.
 *
 * **Limitations**
 *
 * - Cloudflare decides a span's parent from the async context, so an Effect
 *   span created with `root: true` or with a parent from another tracer, such
 *   as an incoming `traceparent`, still nests under the active Cloudflare span.
 * - Cloudflare spans have no events, links, kind, or explicit timestamps. Span
 *   events are dropped, links and kind stay on the Effect span, and Cloudflare
 *   records the timing.
 * - A Cloudflare span belongs to the invocation that created it. An Effect span
 *   that outlives its invocation, such as a `Layer.span` in a module-level
 *   `ManagedRuntime`, stops recording, and spans created under it in later
 *   invocations nest under that invocation's root span.
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Cause from "effect/Cause"
import type * as Context from "effect/Context"
import type * as Exit from "effect/Exit"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Tracer from "effect/Tracer"

/**
 * The part of the Workers `tracing` API the tracer uses, satisfied by both
 * `tracing` from `cloudflare:workers` and `ctx.tracing`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Tracing {
  startSpan(name: string): TracingSpan
  withActiveSpan<T>(span: TracingSpan, callback: () => T): T
}

/**
 * The part of a Workers custom span the tracer uses.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface TracingSpan {
  readonly isTraced: boolean
  spanContext(): { readonly traceId: string; readonly spanId: string }
  setAttribute(key: string, value: string | number | boolean): unknown
  recordException(exception: { readonly name: string; readonly message: string; readonly stack?: string }): void
  setStatus(status: { readonly code: "error"; readonly message?: string }): unknown
  end(): void
}

/**
 * Creates an Effect `Tracer` that records spans with the Workers `tracing`
 * API.
 *
 * **Details**
 *
 * Unsampled Effect spans, such as spans below the `MinimumTraceLevel`, create
 * no Cloudflare span, and work inside them nests under the nearest sampled
 * Effect span. An interrupted span sets the `effect.fiber.interrupted`
 * attribute; any other failure records each error as an exception and sets an
 * error status.
 *
 * @see {@link layer} for providing the tracer as a layer
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make = (options: { readonly tracing: Tracing }): Tracer.Tracer => {
  const tracing = options.tracing

  // Runs `f` with the span's Cloudflare span active, or returns `notEntered`
  // when it has none or it belongs to an earlier invocation.
  const run = <A>(span: CloudflareSpan, f: () => A): A | typeof notEntered => {
    const active = span.active
    if (active === undefined) return notEntered
    let entered = false
    try {
      return tracing.withActiveSpan(active, () => {
        entered = true
        return f()
      })
    } catch (error) {
      if (entered) throw error
      span.detach()
      return notEntered
    }
  }

  return Tracer.make({
    span(options) {
      const parent = Option.isSome(options.parent) && options.parent.value instanceof CloudflareSpan
        ? options.parent.value
        : undefined
      if (!options.sampled) {
        return new CloudflareSpan(options, undefined, parent?.active)
      }
      const start = () => tracing.startSpan(options.name)
      let span = parent === undefined ? notEntered : run(parent, start)
      if (span === notEntered) span = start()
      return new CloudflareSpan(options, span, span)
    },
    context(primitive, fiber) {
      const span = fiber.cache.span
      if (span instanceof CloudflareSpan) {
        const result = run(span, () => primitive["~effect/Effect/evaluate"](fiber))
        if (result !== notEntered) return result
      }
      return primitive["~effect/Effect/evaluate"](fiber)
    }
  })
}

/**
 * Creates a layer that installs a tracer recording Effect spans with the
 * Workers `tracing` API.
 *
 * **Example** (Tracing a Worker)
 *
 * ```ts
 * import { CloudflareTracer } from "@effect/platform-cloudflare"
 * import { tracing } from "cloudflare:workers"
 * import { Effect, ManagedRuntime } from "effect"
 *
 * const runtime = ManagedRuntime.make(CloudflareTracer.layer({ tracing }))
 *
 * export default {
 *   fetch: (request: Request) =>
 *     runtime.runPromise(
 *       Effect.promise(() => fetch("https://example.com")).pipe(
 *         Effect.map((response) => new Response(response.body)),
 *         Effect.withSpan("proxy", { attributes: { "url.full": request.url } })
 *       )
 *     )
 * }
 * ```
 *
 * @see {@link make} for creating the tracer directly
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const layer = (options: { readonly tracing: Tracing }): Layer.Layer<never> =>
  Layer.succeed(Tracer.Tracer, make(options))

const notEntered: unique symbol = Symbol.for("@effect/platform-cloudflare/CloudflareTracer/notEntered")

const zeroTraceId = "00000000000000000000000000000000"
const zeroSpanId = "0000000000000000"

class CloudflareSpan implements Tracer.Span {
  readonly _tag = "Span"
  readonly name: string
  readonly parent: Option.Option<Tracer.AnySpan>
  readonly annotations: Context.Context<never>
  readonly links: Array<Tracer.SpanLink>
  readonly kind: Tracer.SpanKind
  readonly sampled: boolean
  readonly traceId: string
  readonly spanId: string
  readonly attributes = new Map<string, unknown>()
  status: Tracer.SpanStatus
  /** The Cloudflare span this span records to. */
  recorded: TracingSpan | undefined
  /** The Cloudflare span active while this span runs: its own, or its nearest sampled ancestor's. */
  active: TracingSpan | undefined

  constructor(
    options: Parameters<Tracer.Tracer["span"]>[0],
    recorded: TracingSpan | undefined,
    active: TracingSpan | undefined
  ) {
    this.name = options.name
    this.parent = options.parent
    this.annotations = options.annotations
    this.links = options.links
    this.kind = options.kind
    this.recorded = recorded
    this.active = active
    this.sampled = recorded !== undefined && recorded.isTraced
    const context = recorded?.spanContext()
    this.traceId = context?.traceId ??
      (Option.isSome(options.parent) ? options.parent.value.traceId : zeroTraceId)
    this.spanId = context?.spanId ?? zeroSpanId
    this.status = { _tag: "Started", startTime: options.startTime }
  }

  /** Stops using Cloudflare spans that belong to an earlier invocation. */
  detach(): void {
    this.recorded = undefined
    this.active = undefined
  }

  private record(f: (span: TracingSpan) => void): void {
    if (this.recorded === undefined) return
    try {
      f(this.recorded)
    } catch {
      this.detach()
    }
  }

  attribute(key: string, value: unknown): void {
    if (this.status._tag === "Ended") return
    this.attributes.set(key, value)
    this.record((span) => span.setAttribute(key, toAttributeValue(value)))
  }

  event(): void {}

  addLinks(links: ReadonlyArray<Tracer.SpanLink>): void {
    if (this.status._tag === "Ended") return
    // oxlint-disable-next-line no-restricted-syntax
    this.links.push(...links)
  }

  end(endTime: bigint, exit: Exit.Exit<unknown, unknown>): void {
    if (this.status._tag === "Ended") return
    this.status = { _tag: "Ended", startTime: this.status.startTime, endTime, exit }
    this.record((span) => {
      if (exit._tag === "Failure") {
        if (Cause.hasInterruptsOnly(exit.cause)) {
          span.setAttribute("effect.fiber.interrupted", true)
        } else {
          const errors = Cause.prettyErrors(exit.cause, { includeCauseInStack: true })
          for (const error of errors) {
            span.recordException(
              error.stack === undefined
                ? { name: error.name, message: error.message }
                : { name: error.name, message: error.message, stack: error.stack }
            )
          }
          if (errors.length > 0) {
            span.setStatus({ code: "error", message: errors[0].message })
          }
        }
      }
      span.end()
    })
  }
}

const toAttributeValue = (value: unknown): string | number | boolean => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }
  return typeof value === "bigint" ? value.toString() : Inspectable.toStringUnknown(value)
}
