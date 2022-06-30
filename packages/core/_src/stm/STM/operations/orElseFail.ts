/**
 * Tries this effect first, and if it fails or retries, fails with the
 * specified error.
 *
 * @tsplus static effect/core/stm/STM.Aspects orElseFail
 * @tsplus pipeable effect/core/stm/STM orElseFail
 */
export function orElseFail<E1>(e: LazyArg<E1>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R, E | E1, A> => self | STM.fail(e)
}
