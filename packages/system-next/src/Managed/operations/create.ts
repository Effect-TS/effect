// ets_tracing: off

import type { Tuple } from "../../Collections/Immutable/Tuple"
import { managedApply } from "../definition"
import type { Finalizer } from "../ReleaseMap/finalizer"
import type { Effect } from "./_internal/effect"

/**
 * Creates new `Managed` from a `Effect` value that uses a `ReleaseMap` and returns
 * a resource and a finalizer.
 *
 * The correct usage of this constructor consists of:
 *   - Properly registering a finalizer in the ReleaseMap as part of the
 *     `Effect` value;
 *   - Managing interruption safety - take care to use `uninterruptible` or
 *     `uninterruptibleMask` to verify that the finalizer is registered in the
 *     `ReleaseMap` after acquiring the value;
 *   - Returning the finalizer returned from `ReleaseMap#add`. This is important
 *     to prevent double-finalization.
 */
export function create<R, E, A>(effect: Effect<R, E, Tuple<[Finalizer, A]>>) {
  return managedApply(effect)
}
