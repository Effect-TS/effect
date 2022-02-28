import { XPure } from "../../XPure"
import type { Sync } from "../definition"

/**
 * Access the environment monadically.
 *
 * @tsplus static ets/SyncOps environmentWithSync
 */
export function environmentWithSync<R, R1, E, A>(
  f: (_: R) => Sync<R1, E, A>
): Sync<R1 & R, E, A> {
  return XPure.environmentWithXPure(f)
}
