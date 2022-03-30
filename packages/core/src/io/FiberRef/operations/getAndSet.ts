import { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import type { FiberRef } from "../definition"

/**
 * Atomically sets the value associated with the current fiber and returns
 * the old value.
 *
 * @tsplus fluent ets/FiberRef getAndSet
 */
export function getAndSet_<A>(
  self: FiberRef<A>,
  value: A,
  __tsplusTrace?: string
): UIO<A> {
  return self.modify((v) => Tuple(v, value))
}

/**
 * Atomically sets the value associated with the current fiber and returns
 * the old value.
 */
export const getAndSet = Pipeable(getAndSet_)
