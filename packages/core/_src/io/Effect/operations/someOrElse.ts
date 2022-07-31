/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus static effect/core/io/Effect.Aspect someOrElse
 * @tsplus pipeable effect/core/io/Effect someOrElse
 */
export function someOrElse<B>(orElse: LazyArg<B>) {
  return <R, E, A>(self: Effect<R, E, Maybe<A>>): Effect<R, E, A | B> =>
    self.map((option) => option.getOrElse(orElse))
}
