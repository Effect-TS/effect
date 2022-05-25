/**
 * @tsplus static ets/Sink/Ops never
 */
export const never: Sink<unknown, never, unknown, unknown, never> = Sink.fromEffect(
  Effect.never
)
