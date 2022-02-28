import type { LazyArg } from "../../../data/Function"
import { XPure } from "../../XPure"
import type { Sync } from "../definition"

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 *
 * @tsplus static ets/SyncOps succeed
 */
export function succeed<A>(a: LazyArg<A>): Sync<unknown, never, A> {
  return XPure.succeed(a)
}
