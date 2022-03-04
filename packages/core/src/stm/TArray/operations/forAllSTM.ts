import type { STM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Atomically evaluate the conjunction of a transactional predicate across the
 * members of the array.
 *
 * @tsplus fluent ets/TArray forAllSTM
 */
export function forAllSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, boolean>
): STM<unknown, E, boolean> {
  return self.countSTM(f).map((n) => n === self.size)
}

/**
 * Atomically evaluate the conjunction of a transactional predicate across the
 * members of the array.
 *
 * @ets_data_first forAllSTM_
 */
export function forAllSTM<E, A>(f: (a: A) => STM<unknown, E, boolean>) {
  return (self: TArray<A>): STM<unknown, E, boolean> => self.forAllSTM(f)
}
