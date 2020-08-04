import { Sync } from "./effect"
import { succeed } from "./succeed"

/**
 * Returns the effect resulting from mapping the success of this effect to unit.
 */
export const unit: Sync<void> = succeed(undefined)
