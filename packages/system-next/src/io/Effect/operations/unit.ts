import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * An effect that succeeds with a unit value.
 *
 * @tsplus static ets/EffectOps unit
 */
export const unit: UIO<void> = Effect.succeedNow(undefined)

/**
 * An effect that succeeds with a unit value.
 *
 * @tsplus static ets/EffectOps unitTraced
 */
export function unitTraced(__etsTrace?: string): UIO<void> {
  return Effect.succeedNow(undefined)
}
