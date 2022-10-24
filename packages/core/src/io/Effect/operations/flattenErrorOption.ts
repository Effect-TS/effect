import * as Option from "@fp-ts/data/Option"

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus static effect/core/io/Effect.Aspects flattenErrorOption
 * @tsplus pipeable effect/core/io/Effect flattenErrorOption
 * @category sequencing
 * @since 1.0.0
 */
export function flattenErrorOption<E1>(def: E1) {
  return <R, E, A>(self: Effect<R, Option.Option<E>, A>): Effect<R, E | E1, A> =>
    self.mapError(Option.getOrElse(def))
}
