/**
 * Returns an effect with the empty value.
 *
 * @tsplus static ets/Effect/Ops none
 */
export const succeedNone: Effect<never, never, Maybe<never>> = Effect.succeed(Maybe.none)
