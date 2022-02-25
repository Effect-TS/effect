import { identity } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Effect } from "../definition"

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @tsplus fluent ets/Effect refineOrDie
 */
export function refineOrDie_<R, A, E, E1>(
  self: Effect<R, E, A>,
  pf: (e: E) => Option<E1>,
  __tsplusTrace?: string
) {
  return self.refineOrDieWith(pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @ets_data_first refineOrDie_
 */
export function refineOrDie<E, E1>(pf: (e: E) => Option<E1>, __tsplusTrace?: string) {
  return <R, A>(self: Effect<R, E, A>) => self.refineOrDie(pf)
}
