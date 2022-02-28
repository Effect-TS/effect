import type { LazyArg } from "../../../data/Function"
import { XPure } from "../../XPure"
import type { Sync } from "../definition"

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 *
 * @tsplus static ets/SyncOps fail
 */
export function fail<E>(e: LazyArg<E>): Sync<unknown, E, never> {
  return XPure.fail(e)
}
