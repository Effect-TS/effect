import { constFalse, constTrue } from "../../../data/Function"
import type { Effect, RIO } from "../definition"

/**
 * Returns whether this effect is a success.
 *
 * @tsplus fluent ets/Effect isSuccess
 */
export function isSuccess<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): RIO<R, boolean> {
  return self.fold(constFalse, constTrue)
}
