import type { Option } from "../../../../data/Option"
import type { USTM } from "../../../STM"
import type { Atomic } from "../Atomic"

/**
 * Updates the value of the variable.
 *
 * @tsplus fluent ets/AtomicTRef updateSomeAndGet
 */
export function updateSomeAndGet_<A>(
  self: Atomic<A>,
  pf: (a: A) => Option<A>
): USTM<A> {
  return self.updateAndGet((a) => {
    const result = pf(a)
    return result._tag === "Some" ? result.value : a
  })
}

/**
 * Updates the value of the variable.
 *
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(pf: (a: A) => Option<A>) {
  return (self: Atomic<A>): USTM<A> => self.updateSomeAndGet(pf)
}
