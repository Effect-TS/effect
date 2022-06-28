import { concreteFiberRef } from "@effect/core/io/FiberRef/operations/_internal/FiberRefInternal"

/**
 * The initial patch that is applied to the value of the `FiberRef` when a new
 * fiber is forked.
 *
 * @tsplus getter effect/core/io/FiberRef fork
 */
export function fork_<Value, Patch>(self: FiberRef<Value, Patch>): Patch {
  concreteFiberRef(self)
  return self._fork as Patch
}

/**
 * The initial patch that is applied to the value of the `FiberRef` when a new
 * fiber is forked.
 *
 * @tsplus static effect/core/io/FiberRef.Aspects fork
 */
export const fork = Pipeable(fork_)
