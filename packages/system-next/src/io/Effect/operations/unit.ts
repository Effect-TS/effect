import type { UIO } from "../definition"
import { succeedNow } from "./succeedNow"

/**
 * An effect that succeeds with a unit value.
 *
 * @ets static ets/EffectOps unit
 */
export const unit: UIO<void> = succeedNow(undefined)

/**
 * An effect that succeeds with a unit value.
 *
 * @ets static ets/EffectOps unitTraced
 */
export function unitTraced(__trace?: string): UIO<void> {
  return succeedNow(undefined, __trace)
}
