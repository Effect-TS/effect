import * as Iter from "../../../collection/immutable/Iterable"
import { Managed } from "../definition"

/**
 * Returns a managed resource that attempts to acquire this managed resource
 * and in case of failure, attempts to acquire each of the specified managed
 * resources in order until one of them is successfully acquired, ensuring
 * that the acquired resource is properly released after being used.
 *
 * @ets static ets/ManagedOps firstSuccessOf
 */
export function firstSuccessOf_<R, E, A>(
  first: Managed<R, E, A>,
  rest: Iterable<Managed<R, E, A>>,
  __etsTrace?: string
): Managed<R, E, A> {
  return Managed.suspend(Iter.reduce_(rest, first, (b, a) => b | a))
}

/**
 * Returns a managed resource that attempts to acquire this managed resource
 * and in case of failure, attempts to acquire each of the specified managed
 * resources in order until one of them is successfully acquired, ensuring
 * that the acquired resource is properly released after being used.
 *
 * @ets_data_first firstSuccessOf_
 */
export function firstSuccessOf<R, E, A>(
  rest: Iterable<Managed<R, E, A>>,
  __etsTrace?: string
) {
  return (first: Managed<R, E, A>): Managed<R, E, A> => firstSuccessOf_(first, rest)
}
