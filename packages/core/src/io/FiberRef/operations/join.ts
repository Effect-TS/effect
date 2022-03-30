import type { FiberRef } from "../definition"
import { concreteFiberRef } from "./_internal/FiberRefInternal"

/**
 * @tsplus fluent ets/FiberRef join
 */
export function join_<A>(
  self: FiberRef<A>,
  left: A,
  right: A,
  __tsplusTrace?: string
): A {
  concreteFiberRef(self)
  return self._join(left, right)
}

export const join = Pipeable(join_)
