import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise.
 *
 * @tsplus static ets/ManagedOps cond
 */
export function cond<E, A>(
  pred: LazyArg<boolean>,
  result: LazyArg<A>,
  error: LazyArg<E>,
  __tsplusTrace?: string
): Managed<unknown, E, A> {
  return Managed.suspend(pred() ? Managed.succeed(result) : Managed.fail(error))
}
