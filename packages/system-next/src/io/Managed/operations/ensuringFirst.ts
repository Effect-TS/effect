import type { Effect } from "../../Effect"
import type { Managed } from "../definition"

/**
 * Ensures that `f` is executed when this `Managed` is finalized, before the
 * existing finalizer.
 *
 * For usecases that need access to the `Managed`'s result, see
 * `Managed#onExitFirst`.
 *
 * @tsplus fluent ets/Managed ensuringFirst
 */
export function ensuringFirst_<R, E, A, R2, X>(
  self: Managed<R, E, A>,
  f: Effect<R2, never, X>,
  __etsTrace?: string
): Managed<R & R2, E, A> {
  return self.onExitFirst(() => f)
}

/**
 * Ensures that `f` is executed when this `Managed` is finalized, before the
 * existing finalizer.
 *
 * For usecases that need access to the `Managed`'s result, see
 * `Managed#onExitFirst`.
 *
 * @ets_data_first ensuringFirst_
 */
export function ensuringFirst<R2, X>(f: Effect<R2, never, X>, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E, A> =>
    ensuringFirst_(self, f)
}
