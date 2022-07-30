/**
 * Returns an effect with the empty value.
 *
 * @tsplus static effect/core/io/Effect.Ops none
 */
export const succeedNone: Effect<never, never, Maybe<never>> = Effect.sync(Maybe.none)
