import * as Either from "@fp-ts/data/Either"

/**
 * @tsplus static effect/core/stm/TDeferred.Aspects succeed
 * @tsplus pipeable effect/core/stm/TDeferred succeed
 * @category destructors
 * @since 1.0.0
 */
export function succeed<A>(value: A) {
  return <E>(self: TDeferred<E, A>): STM<never, never, boolean> => self.done(Either.right(value))
}
