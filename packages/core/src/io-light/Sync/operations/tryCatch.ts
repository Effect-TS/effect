import type { LazyArg } from "../../../data/Function"
import { XPure } from "../../XPure"
import type { Sync } from "../definition"

/**
 * Lift a sync (non failable) computation.
 *
 * @tsplus static ets/SyncOps tryCatch
 */
export function tryCatch<A, E>(
  f: LazyArg<A>,
  onThrow: (u: unknown) => E
): Sync<unknown, E, A> {
  return XPure.tryCatch(f, onThrow)
}
