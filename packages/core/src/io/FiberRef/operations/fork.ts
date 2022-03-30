import type { FiberRef } from "../definition"
import { concreteFiberRef } from "./_internal/FiberRefInternal"

/**
 * @tsplus fluent ets/FiberRef fork
 */
export function fork_<A>(self: FiberRef<A>, value: A, __tsplusTrace?: string): A {
  concreteFiberRef(self)
  return self._fork(value)
}

export const fork = Pipeable(fork_)
