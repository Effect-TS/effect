import { concreteFiberRef } from "@effect/core/io/FiberRef/operations/_internal/FiberRefInternal"

/**
 * Returns the initial value of the `FiberRef`.
 *
 * @tsplus fluent ets/FiberRef initial
 */
export function initial<A, P>(self: FiberRef<A, P>): A {
  concreteFiberRef(self)
  return self._initial
}
