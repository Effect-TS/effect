import { concreteFiberRef } from "@effect/core/io/FiberRef/operations/_internal/FiberRefInternal"

/**
 * The initial patch that is applied to the value of the `FiberRef` when a new
 * fiber is forked.
 *
 * @tsplus getter ets/FiberRef fork
 */
export function fork_<Value, Patch>(self: FiberRef<Value, Patch>): Patch {
  concreteFiberRef(self)
  return self._fork as Patch
}

/**
 * The initial patch that is applied to the value of the `FiberRef` when a new
 * fiber is forked.
 *
 * @tsplus static ets/FiberRef/Aspects fork
 */
export const fork = Pipeable(fork_)
