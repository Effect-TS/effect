import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import type { Ref } from "../definition"

/**
 * Atomically modifies the `Ref` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 *
 * @tsplus fluent ets/Ref getAndUpdateSome
 */
export function getAndUpdateSome_<A>(
  self: Ref<A>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): UIO<A> {
  return self.modify((v) => {
    const result = pf(v)
    return Tuple(v, result._tag === "Some" ? result.value : v)
  })
}

/**
 * Atomically modifies the `Ref` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export const getAndUpdateSome = Pipeable(getAndUpdateSome_)
