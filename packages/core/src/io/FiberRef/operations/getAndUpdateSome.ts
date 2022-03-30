import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import type { FiberRef } from "../definition"

/**
 * Atomically modifies the `XFiberRef` with the specified function and returns
 * the old value. If the function is `None` for the current value it doesn't
 * change it.
 *
 * @tsplus fluent ets/FiberRef getAndUpdateSome
 */
export function getAndUpdateSome_<A>(
  self: FiberRef<A>,
  f: (a: A) => Option<A>,
  __tsplusTrace?: string
): UIO<A> {
  return self.modify((v) => {
    const result = f(v)
    return Tuple(v, result._tag === "Some" ? result.value : v)
  })
}

/**
 * Atomically modifies the `XFiberRef` with the specified function and returns
 * the old value. If the function is `None` for the current value it doesn't
 * change it.
 */
export const getAndUpdateSome = Pipeable(getAndUpdateSome_)
