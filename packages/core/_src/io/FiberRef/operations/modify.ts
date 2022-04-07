import { IFiberRefModify } from "@effect/core/io/Effect/definition/primitives";

/**
 * Atomically modifies the `FiberRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 *
 * @tsplus fluent ets/FiberRef modify
 */
export function modify_<A, B>(
  self: FiberRef<A>,
  f: (a: A) => Tuple<[B, A]>,
  __tsplusTrace?: string
): UIO<B> {
  return new IFiberRefModify(self, f, __tsplusTrace);
}

/**
 * Atomically modifies the `FiberRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 *
 * @tsplus static ets/FiberRef/Aspects modify
 */
export const modify = Pipeable(modify_);
