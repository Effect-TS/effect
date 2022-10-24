/**
 * @tsplus static effect/core/stream/Channel.Ops never
 * @category constructors
 * @since 1.0.0
 */
export const never: Channel<never, unknown, unknown, unknown, never, never, never> = Channel
  .fromEffect(Effect.never)
