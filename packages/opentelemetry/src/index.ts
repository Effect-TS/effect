/**
 * @since 1.0.0
 */
import * as OtelApi from "@opentelemetry/api"

import * as Context from "@effect/data/Context"
import * as Cause from "@effect/io/Cause"
import * as Debug from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"

/**
 * @since 1.0.0
 */
export interface Tracer extends OtelApi.Tracer {}

/**
 * @since 1.0.0
 */
export interface Meter extends OtelApi.Meter {}

/**
 * @since 1.0.0
 */
export interface Span extends OtelApi.Span {}

/**
 * @since 1.0.0
 */
export interface SpanOptions extends OtelApi.SpanOptions {}

/**
 * @since 1.0.0
 */
export const TelemetryTypeId = Symbol.for("@effect/opentelemetry/TelemetryTypeId")

/**
 * @since 1.0.0
 */
export type TelemetryTypeId = typeof TelemetryTypeId

/**
 * @since 1.0.0
 */
export type Api = typeof OtelApi

/**
 * @since 1.0.0
 */
export interface Telemetry {
  readonly [TelemetryTypeId]: TelemetryTypeId
  readonly api: Api
  readonly tracer: Tracer
  readonly meter: Meter
}

/**
 * @since 1.0.0
 */
export const currentTelemetryTag = Context.Tag<Telemetry>("@effect/opentelemetry/currentTelemetryTag")

/**
 * @since 1.0.0
 */
export const currentSpanTag = Context.Tag<Span>("@effect/opentelemetry/currentSpanTag")

/**
 * @since 1.0.0
 */
export const currentSpanOption = Debug.methodWithTrace((trace) =>
  (_: void) =>
    Effect.contextWith(
      (ctx: Context.Context<never>) => Context.getOption(ctx, currentSpanTag)
    ).traced(trace)
)

/**
 * @since 1.0.0
 */
export const currentTelemetryOption = Debug.methodWithTrace((trace) =>
  (_: void) =>
    Effect.contextWith(
      (ctx: Context.Context<never>) => Context.getOption(ctx, currentTelemetryTag)
    ).traced(trace)
)

/**
 * @since 1.0.0
 */
export const withSpan: {
  (name: string, options?: OtelApi.SpanOptions): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(self: Effect.Effect<R, E, A>, name: string, options?: OtelApi.SpanOptions): Effect.Effect<R, E, A>
} = Debug.dualWithTrace<
  (name: string, options?: OtelApi.SpanOptions) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, name: string, options?: OtelApi.SpanOptions) => Effect.Effect<R, E, A>
>(
  (args) => typeof args[0] !== "string",
  (trace) =>
    (self, name, options) =>
      Effect.contextWithEffect((ctx: Context.Context<never>) => {
        const maybeTelemetry = Context.getOption(ctx, currentTelemetryTag)
        return maybeTelemetry._tag === "None" ?
          self :
          Effect.acquireUseRelease(
            Effect.sync(() => {
              const maybeParent = Context.getOption(ctx, currentSpanTag)
              const active = maybeTelemetry.value.api.context.active()
              if (maybeParent._tag === "Some") {
                const context = maybeTelemetry.value.api.trace.setSpan(active, maybeParent.value)
                return maybeTelemetry.value.tracer.startSpan(name, options, context)
              }
              return maybeTelemetry.value.tracer.startSpan(name, options, active)
            }),
            (span) => Effect.provideService(currentSpanTag, span)(self),
            (span, exit) =>
              Effect.sync(() => {
                if (exit._tag === "Success") {
                  span.setStatus({
                    code: maybeTelemetry.value.api.SpanStatusCode.OK
                  })
                } else {
                  if (Cause.isInterruptedOnly(exit.cause)) {
                    span.setStatus({
                      code: maybeTelemetry.value.api.SpanStatusCode.OK
                    })
                  } else {
                    span.setStatus({
                      code: maybeTelemetry.value.api.SpanStatusCode.ERROR,
                      message: Cause.pretty(exit.cause)
                    })
                  }
                }
                span.end()
              })
          )
      }).traced(trace)
)

/**
 * @since 1.0.0
 */
export const Telemetry = (
  { meter, tracer }: {
    meter: { name: string; version?: string }
    tracer: { name: string; version?: string }
  }
) =>
  Layer.sync(
    currentTelemetryTag,
    () => ({
      tracer: OtelApi.trace.getTracer(tracer.name, tracer.version),
      meter: OtelApi.metrics.getMeter(meter.name, meter.version),
      api: OtelApi,
      [TelemetryTypeId]: TelemetryTypeId
    } as const)
  )
