/**
 * @tsplus static ets/Sink/Ops never
 */
export const never: Sink<never, never, unknown, unknown, never> = Sink.fromEffect(
  Effect.never
)
