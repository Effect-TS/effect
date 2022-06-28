/**
 * @tsplus static effect/core/stm/TDeferred.Aspects fail
 * @tsplus pipeable effect/core/stm/TDeferred fail
 */
export function fail<E>(error: E) {
  return <A>(self: TDeferred<E, A>): STM<never, never, boolean> =>
    self.done(
      Either.left(error)
    )
}
