/**
 * Tries this effect first, and if it fails or retries, succeeds with the
 * specified value.
 *
 * @tsplus static effect/core/stm/STM.Aspects orElseSucceed
 * @tsplus pipeable effect/core/stm/STM orElseSucceed
 * @category alternatives
 * @since 1.0.0
 */
export function orElseSucceed<A1>(a: LazyArg<A1>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R, E, A | A1> => self.orElse(STM.sync(a))
}
