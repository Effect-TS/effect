import * as Equal from "@fp-ts/data/Equal"

/**
 * Retries this effect until its error is equal to the specified error.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryUntilEquals
 * @tsplus pipeable effect/core/io/Effect retryUntilEquals
 * @category retrying
 * @since 1.0.0
 */
export function retryUntilEquals<E>(e: E) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.retryUntil((_) => Equal.equals(_, e))
}
