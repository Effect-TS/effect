import { constVoid } from "../../../data/Function"
import { XPure } from "../definition"

/**
 * Constructs a computation that always returns the `Unit` value, passing the
 * state through unchanged.
 */
export const unit = XPure.succeed(constVoid)
