import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Effect } from "../../Effect"
import { Managed } from "../definition"
import type { Finalizer } from "../ReleaseMap/finalizer"

/**
 * Creates new `Managed` from a `Effect` value that uses a `ReleaseMap` and returns
 * a resource and a `Finalizer`.
 *
 * The correct usage of this constructor consists of:
 *   - Properly registering a `Finalizer` in the `ReleaseMap` as part of the
 *     `Effect` value;
 *   - Managing interruption safety - take care to use `Effect.uninterruptible` or
 *     `Effect.uninterruptibleMask` to verify that the `Finalizer` is registered in the
 *     `ReleaseMap` after acquiring the value;
 *   - Returning the `Finalizer` returned from `ReleaseMap.add`. This is important
 *     to prevent double-finalization.
 *
 * @tsplus static ets/ManagedOps create
 */
export function create<R, E, A>(
  effect: Effect<R, E, Tuple<[Finalizer, A]>>,
  __tsplusTrace?: string
) {
  return Managed(effect)
}
