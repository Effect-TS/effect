/**
 * @tsplus static ets/Channel/Ops never
 */
export const never: Channel<never, unknown, unknown, unknown, never, never, never> = Channel.fromEffect(Effect.never)
