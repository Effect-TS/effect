import { identity } from "../../../data/Function"
import type { Effect, RIO } from "../definition"
import { orDieWith_ } from "./orDieWith"

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the effect.
 *
 * @ets fluent ets/Effect orDie
 */
export function orDie<R, E, A>(self: Effect<R, E, A>, __etsTrace?: string): RIO<R, A> {
  return orDieWith_(self, identity, __etsTrace)
}
