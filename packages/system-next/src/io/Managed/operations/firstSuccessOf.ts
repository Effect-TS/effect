import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Returns a managed resource that attempts to acquire this managed resource
 * and in case of failure, attempts to acquire each of the specified managed
 * resources in order until one of them is successfully acquired, ensuring
 * that the acquired resource is properly released after being used.
 *
 * @tsplus static ets/ManagedOps firstSuccessOf
 */
export function firstSuccessOf<R, E, A>(
  first: LazyArg<Managed<R, E, A>>,
  rest: LazyArg<Iterable<Managed<R, E, A>>>,
  __etsTrace?: string
): Managed<R, E, A> {
  return Managed.suspend(Iter.reduce_(rest(), first(), (b, a) => b | a))
}
