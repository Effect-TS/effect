/**
 * Repeats this effect until its value is equal to the specified value or
 * until the first failure.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatUntilEquals
 * @tsplus pipeable effect/core/io/Effect repeatUntilEquals
 */
export function repeatUntilEquals<A>(E: Equivalence<A>, a: A) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.sync(a).flatMap((a) => self.repeatUntil((_) => E.equals(_, a)))
}
