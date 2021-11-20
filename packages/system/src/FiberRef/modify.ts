// ets_tracing: off

import type { Tuple } from "../Collections/Immutable/Tuple"
import type { UIO } from "../Effect/effect"
import { IFiberRefModify } from "../Effect/primitives"
import type { FiberRef } from "./fiberRef"

/**
 * Atomically modifies the `FiberRef` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 *
 * @ets_data_first modify_
 */
export function modify<A, B>(f: (a: A) => Tuple<[B, A]>) {
  return (fiberRef: FiberRef<A>): UIO<B> => new IFiberRefModify(fiberRef, f)
}

/**
 * Atomically modifies the `FiberRef` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modify_<A, B>(
  fiberRef: FiberRef<A>,
  f: (a: A) => Tuple<[B, A]>
): UIO<B> {
  return new IFiberRefModify(fiberRef, f)
}
