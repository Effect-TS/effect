import type { Cause } from "../Cause/cause"
import { empty } from "../Cause/cause"
import { foldCauseM_, succeed } from "./core"
import type { Effect, RIO } from "./effect"

/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did not succeed.
 */
export function cause<R, E, A>(effect: Effect<R, E, A>): RIO<R, Cause<E>> {
  return foldCauseM_(effect, succeed, () => succeed(empty))
}
