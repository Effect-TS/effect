import type { STM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Count the values in the array matching a transactional predicate.
 *
 * @tsplus fluent ets/TArray countSTM
 */
export function countSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, boolean>
): STM<unknown, E, number> {
  return self.reduceSTM(0, (n, a) => f(a).map((result) => (result ? n + 1 : n)))
}

/**
 * Count the values in the array matching a transactional predicate.
 *
 * @ets_data_first countSTM_
 */
export function countSTM<E, A>(f: (a: A) => STM<unknown, E, boolean>) {
  return (self: TArray<A>): STM<unknown, E, number> => self.countSTM(f)
}
