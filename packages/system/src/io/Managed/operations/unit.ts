import { Managed } from "../definition"

/**
 * Returns the effect resulting from mapping the success of this effect to
 * unit.
 *
 * @tsplus static ets/ManagedOps unit
 */
export const unit: Managed<unknown, never, void> = Managed.succeedNow(undefined)
