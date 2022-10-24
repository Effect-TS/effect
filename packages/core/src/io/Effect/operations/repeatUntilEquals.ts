import * as Equal from "@fp-ts/data/Equal"

/**
 * Repeats this effect until its value is equal to the specified value or
 * until the first failure.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatUntilEquals
 * @tsplus pipeable effect/core/io/Effect repeatUntilEquals
 * @category repetititon
 * @since 1.0.0
 */
export function repeatUntilEquals<A>(a: A) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.repeatUntil((_) => Equal.equals(_, a))
}
