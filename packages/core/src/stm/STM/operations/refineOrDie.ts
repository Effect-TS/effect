import { identity } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { STM } from "../definition"

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @tsplus fluent ets/STM refineOrDie
 */
export function refineOrDie_<R, A, E, E1>(
  self: STM<R, E, A>,
  pf: (e: E) => Option<E1>
) {
  return self.refineOrDieWith(pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @ets_data_first refineOrDie_
 */
export function refineOrDie<E, E1>(pf: (e: E) => Option<E1>) {
  return <R, A>(self: STM<R, E, A>) => self.refineOrDie(pf)
}
