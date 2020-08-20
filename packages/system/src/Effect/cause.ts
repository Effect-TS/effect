import type { Cause } from "../Cause/cause"
import { Empty } from "../Cause/cause"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { foldM_ } from "./foldM_"

/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did not succeed.
 */
export const cause = <S, R, E, A>(
  effect: Effect<S, R, E, A>
): Effect<S, R, never, Cause<E>> => foldCauseM_(effect, succeed, () => succeed(Empty))

/**
 * Returns the full exit cause in the error channel
 */
export const causeAsError = <S, R, E, A>(
  effect: Effect<S, R, E, A>
): Effect<S, R, Cause<E>, A> => foldCauseM_(effect, fail, succeed)

/**
 * Opposite of causeAsError
 */
export const errorFromCause = <S, R, E, A>(
  effect: Effect<S, R, Cause<E>, A>
): Effect<S, R, E, A> => foldM_(effect, halt, succeed)
