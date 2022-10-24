/**
 * @tsplus static effect/core/stream/Sink.Ops never
 * @category constructors
 * @since 1.0.0
 */
export const never: Sink<never, never, unknown, unknown, never> = Sink.fromEffect(
  Effect.never
)
