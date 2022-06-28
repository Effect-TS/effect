/**
 * @tsplus static effect/core/stm/TDeferred.Aspects succeed
 * @tsplus pipeable effect/core/stm/TDeferred succeed
 */
export function succeed<A>(value: A) {
  return <E>(self: TDeferred<E, A>): STM<never, never, boolean> => self.done(Either.right(value))
}
