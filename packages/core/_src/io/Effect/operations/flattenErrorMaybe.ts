/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus static effect/core/io/Effect.Aspects flattenErrorMaybe
 * @tsplus pipeable effect/core/io/Effect flattenErrorMaybe
 */
export function flattenErrorMaybe<E1>(def: LazyArg<E1>) {
  return <R, E, A>(self: Effect<R, Maybe<E>, A>): Effect<R, E | E1, A> =>
    self.mapError((e) => e.getOrElse(def))
}
