import { constVoid } from "../../../data/Function"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns a effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 *
 * @tsplus static ets/EffectOps never
 */
export const never: UIO<never> = Effect.async(constVoid)
