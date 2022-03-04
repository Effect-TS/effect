import { Option } from "../../../data/Option"
import { STM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Atomically reduce the non-empty array using a transactional binary
 * operator.
 *
 * @tsplus fluent ets/TArray reduceOptionSTM
 */
export function reduceOptionSTM_<E, A>(
  self: TArray<A>,
  f: (x: A, y: A) => STM<unknown, E, A>
): STM<unknown, E, Option<A>> {
  return self.reduceSTM(Option.emptyOf<A>(), (acc, a) =>
    acc.fold(STM.some(a), (acc) => f(acc, a).map(Option.some))
  )
}

/**
 * Atomically reduce the non-empty array using a transactional binary
 * operator.
 *
 * @ets_data_first reduceOptionSTM_
 */
export function reduceOptionSTM<E, A>(f: (x: A, y: A) => STM<unknown, E, A>) {
  return (self: TArray<A>): STM<unknown, E, Option<A>> => self.reduceOptionSTM(f)
}
