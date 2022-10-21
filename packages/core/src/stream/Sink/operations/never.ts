/**
 * @tsplus static effect/core/stream/Sink.Ops never
 */
export const never: Sink<never, never, unknown, unknown, never> = Sink.fromEffect(
  Effect.never
)
