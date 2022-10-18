import { getCallTrace } from "@effect/core/io/Effect/definition/primitives"
import { currentSpanTracer } from "@effect/core/io/SpanTracer"
/**
 * Used to augment the child effect with a span.
 *
 * @effect traced
 * @tsplus pipeable effect/core/io/Effect withSpan
 * @tsplus static effect/core/io/Effect.Ops withSpan
 * @category tracing
 * @since 1.0.0
 */
export const withSpan: (spanName: string) => <R, E, A>(
  self: Effect<R, E, A>
) => Effect<R, E, A> = (spanName: string) => {
  const trace = getCallTrace()
  return (self) =>
    currentSpanTracer.getWith((tracer) => tracer.withSpan(spanName, trace)(self))._call(trace)
}
