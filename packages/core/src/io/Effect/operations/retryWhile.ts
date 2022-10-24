import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Retries this effect while its error satisfies the specified predicate.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryWhile
 * @tsplus pipeable effect/core/io/Effect retryWhile
 * @category retrying
 * @since 1.0.0
 */
export function retryWhile<E>(f: Predicate<E>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.retryWhileEffect((e) => Effect.sync(f(e)))
}
