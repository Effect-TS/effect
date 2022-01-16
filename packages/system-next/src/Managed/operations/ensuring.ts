// ets_tracing: off

import type { Managed } from "../definition"
import type { Effect } from "./_internal/effect"
import { onExit_ } from "./onExit"

/**
 * Ensures that `f` is executed when this `Managed` is finalized, after the
 * existing finalizer.
 *
 * For usecases that need access to the `Managed`'s result, see
 * `ZManaged#onExit`.
 */
export function ensuring_<R, E, A, R2, X>(
  self: Managed<R, E, A>,
  f: Effect<R2, never, X>,
  __trace?: string
): Managed<R & R2, E, A> {
  return onExit_(self, () => f, __trace)
}

/**
 * Ensures that `f` is executed when this `Managed` is finalized, after the
 * existing finalizer.
 *
 * For usecases that need access to the `Managed`'s result, see
 * `ZManaged#onExit`.
 *
 * @ets_data_first ensuring_
 */
export function ensuring<R2, X>(f: Effect<R2, never, X>, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E, A> =>
    ensuring_(self, f, __trace)
}
