/**
 * Returns an effect with the empty value.
 *
 * @tsplus static ets/Effect/Ops none
 */
export const succeedNone: UIO<Option<never>> = Effect.succeed(Option.none);
