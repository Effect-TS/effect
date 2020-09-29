import type { Cause } from "../Cause/cause"
import { Empty } from "../Cause/cause"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect, RIO } from "./effect"
import { fail } from "./fail"
import { foldM_ } from "./foldM_"

/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did not succeed.
 */
export function cause<R, E, A>(effect: Effect<R, E, A>): RIO<R, Cause<E>> {
  return foldCauseM_(effect, succeed, () => succeed(Empty))
}

/**
 * Returns the full exit cause in the error channel
 */
export function causeAsError<R, E, A>(effect: Effect<R, E, A>): Effect<R, Cause<E>, A> {
  return foldCauseM_(effect, fail, succeed)
}

/**
 * Opposite of causeAsError
 */
export function errorFromCause<R, E, A>(
  effect: Effect<R, Cause<E>, A>
): Effect<R, E, A> {
  return foldM_(effect, halt, succeed)
}
