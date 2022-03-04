import type { Option } from "../../../../data/Option"
import type { USTM } from "../../../STM"
import type { Atomic } from "../Atomic"

/**
 * Updates the value of the variable.
 *
 * @tsplus fluent ets/AtomicTRef updateSome
 */
export function updateSome_<A>(self: Atomic<A>, pf: (a: A) => Option<A>): USTM<void> {
  return self.update((a) => {
    const result = pf(a)
    return result._tag === "Some" ? result.value : a
  })
}

/**
 * Updates the value of the variable.
 *
 * @ets_data_first updateSome_
 */
export function updateSome<A>(pf: (a: A) => Option<A>) {
  return (self: Atomic<A>): USTM<void> => self.updateSome(pf)
}
