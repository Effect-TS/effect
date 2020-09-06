import type { Effect } from "../../Effect"
import { onExitFirst, onExitFirst_ } from "../core"
import type { Managed } from "../managed"

/**
 * Ensures that `f` is executed when this {@link Managed} is finalized, before
 * the existing finalizer.
 *
 * For use cases that need access to the Managed's result, see {@link onExitFirst}.
 */
export function ensuringFirst<S1, R1>(
  f: Effect<S1, R1, never, unknown>
): <S, R, E, A>(self: Managed<S, R, E, A>) => Managed<S | S1, R & R1, E, A> {
  return onExitFirst(() => f)
}

/**
 * Ensures that `f` is executed when this {@link Managed} is finalized, before
 * the existing finalizer.
 *
 * For use cases that need access to the Managed's result, see {@link onExitFirst_}.
 */
export function ensuringFirst_<S, R, E, A, S1, R1>(
  self: Managed<S, R, E, A>,
  f: Effect<S1, R1, never, unknown>
): Managed<S | S1, R & R1, E, A> {
  return onExitFirst_(self, () => f)
}
