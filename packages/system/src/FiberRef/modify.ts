// ets_tracing: off

import type { UIO } from "../Effect/effect"
import { IFiberRefModify } from "../Effect/primitives"
import type { FiberRef } from "./fiberRef"

/**
 * Atomically modifies the `FiberRef` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modify<A, B>(f: (a: A) => [B, A]) {
  return (fiberRef: FiberRef<A>): UIO<B> => new IFiberRefModify(fiberRef, f)
}
