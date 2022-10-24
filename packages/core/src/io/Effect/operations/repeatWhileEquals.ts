import * as Equal from "@fp-ts/data/Equal"

/**
 * Repeats this effect for as long as its value is equal to the specified
 * value or until the first failure.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatWhileEquals
 * @tsplus pipeable effect/core/io/Effect repeatWhileEquals
 * @category repetititon
 * @since 1.0.0
 */
export function repeatWhileEquals<A>(a: A) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.repeatWhile((_) => Equal.equals(_, a))
}
