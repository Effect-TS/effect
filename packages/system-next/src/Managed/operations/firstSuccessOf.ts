// ets_tracing: off

import * as Iter from "../../Iterable"
import type { Managed } from "../definition"
import { orElse_ } from "./orElse"
import { suspend } from "./suspend"

/**
 * Returns a managed resource that attempts to acquire this managed resource
 * and in case of failure, attempts to acquire each of the specified managed
 * resources in order until one of them is successfully acquired, ensuring
 * that the acquired resource is properly released after being used.
 */
export function firstSuccessOf_<R, E, A>(
  first: Managed<R, E, A>,
  rest: Iterable<Managed<R, E, A>>,
  __trace?: string
): Managed<R, E, A> {
  return suspend(() => Iter.reduce_(rest, first, (b, a) => orElse_(b, () => a)))
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
  __trace?: string
) {
  return (first: Managed<R, E, A>): Managed<R, E, A> =>
    firstSuccessOf_(first, rest, __trace)
}
