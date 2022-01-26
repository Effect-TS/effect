import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise.
 *
 * @ets static ets/ManagedOps cond
 */
export function cond_<E, A>(
  pred: LazyArg<boolean>,
  result: LazyArg<A>,
  error: LazyArg<E>,
  __etsTrace?: string
): Managed<unknown, E, A> {
  return pred() ? Managed.succeed(result) : Managed.fail(error)
}

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise.
 *
 * @ets_data_first cond_
 */
export function cond<E, A>(result: LazyArg<A>, error: LazyArg<E>, __etsTrace?: string) {
  return (pred: LazyArg<boolean>): Managed<unknown, E, A> => cond_(pred, result, error)
}
