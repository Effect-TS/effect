import type { Predicate } from "../../../data/Function"
import type { STM } from "../../STM"
import type { TArray } from "../definition"

/**
   * Determine if the array contains a value satisfying a transactional
   * predicate.
 *
 * @tsplus fluent ets/TArray existsSTM
 */
export function existsSTM_<E, A>(self: TArray<A>, f: (a: A) => STM<unknown, E, boolean>): STM<unknown, E, boolean> {
  return self.countSTM(f).map((n) => n > 0)
}

/**
   * Determine if the array contains a value satisfying a transactional
   * predicate.
 *
 * @ets_data_first existsSTM_
 */
export function existsSTM<A>(f: (a: A) => STM<unknown, E, boolean>) {
  return (self: TArray<A>): STM<unknown, E, boolean> => self.existsSTM(f)
}
