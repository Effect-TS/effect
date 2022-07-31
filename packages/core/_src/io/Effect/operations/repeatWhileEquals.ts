/**
 * Repeats this effect for as long as its value is equal to the specified
 * value or until the first failure.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatWhileEquals
 * @tsplus pipeable effect/core/io/Effect repeatWhileEquals
 */
export function repeatWhileEquals<A>(E: Equivalence<A>, a: LazyArg<A>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.sync(a).flatMap((a) => self.repeatWhile((_) => E.equals(_, a)))
}
