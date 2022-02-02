import { identity } from "../../../data/Function"
import { Cause } from "../../Cause"
import type { Effect, RIO } from "../definition"

/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did succeed.
 *
 * @tsplus fluent ets/Effect cause
 */
export function cause<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): RIO<R, Cause<E>> {
  return self.foldCause(identity, () => Cause.empty)
}
