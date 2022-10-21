/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static effect/core/stm/STM.Aspects refineOrDieWith
 * @tsplus pipeable effect/core/stm/STM refineOrDieWith
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => Maybe<E1>,
  f: (e: E) => unknown
) {
  return <R, A>(self: STM<R, E, A>): STM<R, E1, A> =>
    self.catchAll((e) =>
      pf(e).fold(
        () => STM.dieSync(f(e)),
        (e1) => STM.fail(e1)
      )
    )
}
