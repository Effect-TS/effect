import { Sync } from "./effect"
import { succeedNow } from "./succeedNow"

/**
 * Returns the effect resulting from mapping the success of this effect to unit.
 */
export const unit: Sync<void> = succeedNow(undefined)
