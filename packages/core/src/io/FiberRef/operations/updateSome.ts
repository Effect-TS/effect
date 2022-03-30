import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import type { FiberRef } from "../definition"

/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it doesn't change it.
 *
 * @tsplus fluent ets/FiberRef updateSome
 */
export function updateSome_<A>(
  self: FiberRef<A>,
  f: (a: A) => Option<A>,
  __tsplusTrace?: string
): UIO<void> {
  return self.modify((v) => {
    const result = f(v)
    return Tuple(undefined, result._tag === "Some" ? result.value : v)
  })
}

/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it doesn't change it.
 */
export const updateSome = Pipeable(updateSome_)
