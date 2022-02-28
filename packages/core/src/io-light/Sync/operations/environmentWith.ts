import { XPure } from "../../XPure"
import type { Sync } from "../definition"

/**
 * Access the environment with the specified function.
 *
 * @tsplus static ets/SyncOps environmentWith
 */
export function environmentWith<R, A>(f: (_: R) => A): Sync<R, never, A> {
  return XPure.environmentWith(f)
}
