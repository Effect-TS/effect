/**
 * @tsplus static ets/Channel/Ops never
 */
export const never: Channel<unknown, unknown, unknown, unknown, never, never, never> = Channel.fromEffect(Effect.never);
