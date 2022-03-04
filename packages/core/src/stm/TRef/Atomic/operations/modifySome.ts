import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import type { USTM } from "../../../STM"
import type { Atomic } from "../Atomic"

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus fluent ets/AtomicTRef modifySome
 */
export function modifySome_<A, B>(
  self: Atomic<A>,
  def: B,
  pf: (a: A) => Option<Tuple<[B, A]>>
): USTM<B> {
  return self.modify((a) => pf(a).getOrElse(Tuple(def, a)))
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @ets_data_first modifySome_
 */
export function modifySome<A, B>(def: B, pf: (a: A) => Option<Tuple<[B, A]>>) {
  return (self: Atomic<A>): USTM<B> => self.modifySome(def, pf)
}
