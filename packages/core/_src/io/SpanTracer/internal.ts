/**
 * @category symbols
 * @since 1.0.0
 */
export const SpanTracerTypeId: unique symbol = Symbol.for("@effect/core/io/SpanTracer")
export type SpanTracerTypeId = typeof SpanTracerTypeId

/**
 * The Tracer service is used to provide tracing facilities to Effect.
 *
 * This service is meant to be implemented by exporters such as opentelemetry.
 *
 * @tsplus type effect/core/io/SpanTracer
 * @category models
 * @since 1.0.0
 */
export interface SpanTracer {
  readonly _id: SpanTracerTypeId
  readonly withSpan: (
    spanName: string,
    trace?: string
  ) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
}

/**
 * @tsplus type effect/core/io/SpanTracer.Ops
 * @category companion
 * @since 1.0.0
 */
export interface SpanTracerOps {
}

/**
 * @category companion
 * @since 1.0.0
 */
export const SpanTracer: SpanTracerOps = {}

/**
 * @tsplus static effect/core/io/SpanTracer.Ops make
 * @category constructors
 * @since 1.0.0
 */
export const make = (
  withSpan: (
    spanName: string,
    trace?: string
  ) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
): SpanTracer => ({ _id: SpanTracerTypeId, withSpan })

/**
 * @tsplus static effect/core/io/SpanTracer.Ops identityTracer
 * @category tracers
 * @since 1.0.0
 */
export const identity = make(() => (self) => self)
