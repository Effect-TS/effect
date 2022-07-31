/**
 * @tsplus static effect/core/stream/Channel.Ops never
 */
export const never: Channel<never, unknown, unknown, unknown, never, never, never> = Channel
  .fromEffect(Effect.never)
