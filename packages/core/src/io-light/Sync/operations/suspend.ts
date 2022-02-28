import type { LazyArg } from "../../../data/Function"
import { XPure } from "../../XPure"
import type { Sync } from "../definition"

/**
 * Suspend a computation, useful in recursion.
 *
 * @tsplus static ets/SyncOps suspend
 */
export function suspend<R, E, A>(f: LazyArg<Sync<R, E, A>>): Sync<R, E, A> {
  return XPure.suspend(f)
}
