import type { STM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Get the index of the next entry that matches a transactional predicate.
 *
 * @tsplus fluent ets/TArray indexWhereSTM
 */
export function indexWhereSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, boolean>
): STM<unknown, E, number> {
  return self.indexWhereFromSTM(f, 0)
}

/**
 * Get the index of the next entry that matches a transactional predicate.
 *
 * @ets_data_first indexWhereSTM_
 */
export function indexWhereSTM<E, A>(f: (a: A) => STM<unknown, E, boolean>) {
  return (self: TArray<A>): STM<unknown, E, number> => self.indexWhereSTM(f)
}
