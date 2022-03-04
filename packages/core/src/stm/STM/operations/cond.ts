import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise
 *
 * For effectful conditionals, see `ifSTM`.
 *
 * @tsplus static ets/STMOps cond
 */
export function cond<E, A>(
  predicate: LazyArg<boolean>,
  result: LazyArg<A>,
  error: LazyArg<E>
): STM<unknown, E, A> {
  return STM.suspend(() => (predicate() ? STM.succeed(result) : STM.fail(error)))
}
