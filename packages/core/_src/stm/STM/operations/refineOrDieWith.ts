/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus fluent ets/STM refineOrDieWith
 */
export function refineOrDieWith_<R, A, E, E1>(
  self: STM<R, E, A>,
  pf: (e: E) => Maybe<E1>,
  f: (e: E) => unknown
) {
  return self.catchAll((e) =>
    pf(e).fold(
      () => STM.dieNow(f(e)),
      (e1) => STM.failNow(e1)
    )
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static ets/STM/Aspects refineOrDieWith
 */
export const refineOrDieWith = Pipeable(refineOrDieWith_)
