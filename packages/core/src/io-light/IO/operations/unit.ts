import { constVoid } from "../../../data/Function"
import type { IO } from "../definition"
import { Succeed } from "../definition"

/**
 * Constructs a computation that always returns the `Unit` value.
 *
 * @tsplus static ets/IOOps unit
 */
export const unit: IO<void> = new Succeed(constVoid)
