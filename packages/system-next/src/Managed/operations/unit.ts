// ets_tracing: off

import type { Managed } from "../definition"
import { succeedNow } from "./succeedNow"

/**
 * Returns the effect resulting from mapping the success of this effect to
 * unit.
 */
export const unit: Managed<unknown, never, void> = succeedNow(undefined)
