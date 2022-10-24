import * as Equal from "@fp-ts/data/Equal"

/**
 * Retries this effect for as long as its error is equal to the specified
 * error.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryWhileEquals
 * @tsplus pipeable effect/core/io/Effect retryWhileEquals
 * @category retrying
 * @since 1.0.0
 */
export function retryWhileEquals<E>(e: E) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.retryWhile((err) => Equal.equals(e, err))
}
