/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise
 *
 * For effectful conditionals, see `ifSTM`.
 *
 * @tsplus static ets/STM/Ops cond
 */
export function cond<E, A>(
  predicate: LazyArg<boolean>,
  result: LazyArg<A>,
  error: LazyArg<E>
): STM<never, E, A> {
  return STM.suspend(() => (predicate() ? STM.succeed(result) : STM.fail(error)))
}
