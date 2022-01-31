import { Managed } from "../definition"

/**
 * Returns the effect resulting from mapping the success of this effect to
 * unit.
 *
 * @ets static ets/ManagedOps unit
 */
export const unit: Managed<unknown, never, void> = Managed.succeedNow(undefined)
