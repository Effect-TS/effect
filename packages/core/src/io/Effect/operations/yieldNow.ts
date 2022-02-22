import type { UIO } from "../definition"
import { IYield } from "../definition"

/**
 * Returns an effect that yields to the runtime system, starting on a fresh
 * stack. Manual use of this method can improve fairness, at the cost of
 * overhead.
 *
 * @tsplus static ets/EffectOps yieldNow
 */
export const yieldNow: UIO<void> = new IYield()
