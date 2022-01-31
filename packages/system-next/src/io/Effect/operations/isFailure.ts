import { constFalse, constTrue } from "../../../data/Function"
import type { Effect, RIO } from "../definition"

/**
 * Returns whether this effect is a failure.
 *
 * @tsplus fluent ets/Effect isFailure
 */
export function isFailure<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): RIO<R, boolean> {
  return self.fold(constTrue, constFalse)
}
