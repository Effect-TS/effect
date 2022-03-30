import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import type { FiberRef } from "../definition"

/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it returns the old
 * value without changing it.
 *
 * @tsplus fluent ets/FiberRef updateSomeAndGet
 */
export function updateSomeAndGet_<A>(
  self: FiberRef<A>,
  f: (a: A) => Option<A>,
  __tsplusTrace?: string
): UIO<A> {
  return self.modify((v) => {
    const result = f(v)
    return result._tag === "Some" ? Tuple(result.value, result.value) : Tuple(v, v)
  })
}

/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it returns the old
 * value without changing it.
 */
export const updateSomeAndGet = Pipeable(updateSomeAndGet_)
