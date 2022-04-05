import { concreteFiberRef } from "@effect-ts/core/io/FiberRef/operations/_internal/FiberRefInternal";

/**
 * @tsplus fluent ets/FiberRef join
 */
export function join_<A>(
  self: FiberRef<A>,
  left: A,
  right: A,
  __tsplusTrace?: string
): A {
  concreteFiberRef(self);
  return self._join(left, right);
}

/**
 * @tsplus static ets/FiberRef/Aspects join
 */
export const join = Pipeable(join_);
