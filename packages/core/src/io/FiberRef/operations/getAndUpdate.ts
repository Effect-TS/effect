import { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import type { FiberRef } from "../definition"

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the old value.
 *
 * @tsplus fluent ets/FiberRef getAndUpdate
 */
export function getAndUpdate_<A>(
  self: FiberRef<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): UIO<A> {
  return self.modify((v) => Tuple(v, f(v)))
}

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the old value.
 */
export const getAndUpdate = Pipeable(getAndUpdate_)
