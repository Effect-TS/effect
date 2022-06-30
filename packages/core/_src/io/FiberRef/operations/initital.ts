import { concreteFiberRef } from "@effect/core/io/FiberRef/operations/_internal/FiberRefInternal"

/**
 * Returns the initial value of the `FiberRef`.
 *
 * @tsplus getter effect/core/io/FiberRef initial
 */
export function initial<A, P>(self: FiberRef<A, P>): A {
  concreteFiberRef(self)
  return self._initial
}
