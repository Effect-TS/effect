import { concreteFiberRef } from "@effect-ts/core/io/FiberRef/operations/_internal/FiberRefInternal";

/**
 * @tsplus fluent ets/FiberRef fork
 */
export function fork_<A>(self: FiberRef<A>, value: A, __tsplusTrace?: string): A {
  concreteFiberRef(self);
  return self._fork(value);
}

/**
 * @tsplus static ets/FiberRef/Aspects fork
 */
export const fork = Pipeable(fork_);
