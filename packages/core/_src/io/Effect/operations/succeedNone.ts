/**
 * Returns an effect with the empty value.
 *
 * @tsplus static ets/Effect/Ops none
 */
export const succeedNone: Effect.UIO<Maybe<never>> = Effect.succeed(Maybe.none)
