import { constVoid } from "../../../data/Function"
import { Sync } from "../definition"

/**
 * Constructs a computation that always returns the `Unit` value, passing the
 * state through unchanged.
 *
 * @tsplus static ets/SyncOps unit
 */
export const unit: Sync<unknown, never, void> = Sync.succeed(constVoid)
