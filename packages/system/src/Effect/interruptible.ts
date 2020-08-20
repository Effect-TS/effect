import { interruptible as statusInterruptible } from "../Fiber/core"
import { pipe } from "../Function"
import { interruptStatus } from "./core"
import type { Effect } from "./effect"

/**
 * Returns a new effect that performs the same operations as this effect, but
 * interruptibly, even if composed inside of an uninterruptible region.
 *
 * Note that effects are interruptible by default, so this function only has
 * meaning if used within an uninterruptible region.
 *
 * WARNING: This operator "punches holes" into effects, allowing them to be
 * interrupted in unexpected places. Do not use this operator unless you know
 * exactly what you are doing. Instead, you should use `uninterruptibleMask`.
 */
export const interruptible = <S, R, E, A>(effect: Effect<S, R, E, A>) =>
  pipe(effect, interruptStatus(statusInterruptible))
