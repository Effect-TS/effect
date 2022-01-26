import { identity } from "../../../data/Function"
import type { Cause } from "../../Cause"
import { empty } from "../../Cause"
import type { Effect, RIO } from "../definition"

/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did succeed.
 *
 * @ets fluent ets/Effect cause
 */
export function cause<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): RIO<R, Cause<E>> {
  return self.foldCause(identity, () => empty)
}
