import type { Managed } from "../definition"
import { fail } from "./fail"
import { succeed } from "./succeed"

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise.
 */
export function cond_<E, A>(
  pred: boolean,
  result: () => A,
  error: () => E
): Managed<unknown, E, A> {
  return pred ? succeed(result) : fail(error)
}

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise.
 *
 * @ets_data_first cond_
 */
export function cond<E, A>(
  result: () => A,
  error: () => E
): (pred: boolean) => Managed<unknown, E, A> {
  return (pred) => cond_(pred, result, error)
}
