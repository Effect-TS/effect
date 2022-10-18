import { runtimeDebug } from "@effect/core/io/Debug"
import { make, SpanTracer } from "@effect/core/io/SpanTracer/internal"

export { make, SpanTracer, SpanTracerTypeId } from "@effect/core/io/SpanTracer/internal"

/**
 * @category symbols
 * @since 1.0.0
 */
export const SpanTypeId: unique symbol = Symbol.for("@effect/core/io/SpanTracer/Span")
export type SpanTypeId = typeof SpanTypeId

/**
 * The Span object provides access to the current span.
 *
 * @category models
 * @since 1.0.0
 */
export interface Span {
  readonly _id: SpanTypeId
  readonly parent: Maybe<Span>
  readonly name: string
  readonly trace?: string
}

/**
 * Checks if an unknown value is of type Span
 *
 * @category guards
 * @since 1.0.0
 */
export const isSpan = (u: unknown): u is Span =>
  typeof u === "object" && u != null && "_id" in u && u["_id"] === SpanTypeId

/**
 * Used to track the current span by the default Tracer.
 *
 * @category fiberRefs
 * @since 1.0.0
 */
export const currentSpan = FiberRef.unsafeMake<Maybe<Span>>(Maybe.none)

/**
 * Used to track the current SpanTracer.
 *
 * @tsplus static effect/core/io/SpanTracer.Ops causeTracer
 * @category tracers
 * @since 1.0.0
 */
export const causeTracer = make((name, trace) =>
  (self) =>
    Effect.uninterruptibleMask(({ restore }) =>
      currentSpan.get.flatMap((parent) => {
        const child: Span = { _id: SpanTypeId, parent, name, trace }
        return currentSpan.set(Maybe.some(child)).zipRight(
          restore(self)
            .foldCauseEffect(
              (cause) =>
                currentSpan.set(parent).zipRight(
                  Effect.failCause(cause.withAnnotation(child))
                ),
              (value) => currentSpan.set(parent).zipRight(Effect.succeed(value))
            )
        )
      })
    )
)

/**
 * Used to track the current Tracer.
 *
 * @category fiberRefs
 * @since 1.0.0
 */
export const currentSpanTracer = FiberRef.unsafeMake<SpanTracer>(
  runtimeDebug.defaultSpanTracer === "identity" ? SpanTracer.identityTracer : causeTracer
)

/**
 * Used to track the current SpanTracer.
 *
 * @tsplus static effect/core/io/SpanTracer.Ops cause
 * @category layers
 * @since 1.0.0
 */
export const cause = Layer.scopedDiscard(
  currentSpanTracer.locallyScopedWith((tracer) =>
    tracer !== causeTracer ? tracer.combineWith(causeTracer) : tracer
  )
)

/**
 * The Span object provides access to the current span.
 *
 * @tsplus pipeable effect/core/io/SpanTracer combineWith
 * @category combinators
 * @since 1.0.0
 */
export const combineWith = (that: SpanTracer) =>
  (self: SpanTracer): SpanTracer =>
    make((name, trace) =>
      (effect) => that.withSpan(name, trace)(self.withSpan(name, trace)(effect))
    )
