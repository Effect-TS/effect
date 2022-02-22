import type { Effect } from "../../Effect"
import type { Managed } from "../definition"

/**
 * Ensures that `f` is executed when this `Managed` is finalized, after the
 * existing finalizer.
 *
 * For use cases that need access to the `Managed`'s result, see
 * `Managed.onExit`.
 *
 * @tsplus fluent ets/Managed ensuring
 */
export function ensuring_<R, E, A, R2, X>(
  self: Managed<R, E, A>,
  f: Effect<R2, never, X>,
  __etsTrace?: string
): Managed<R & R2, E, A> {
  return self.onExit(() => f)
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
export function ensuring<R2, X>(f: Effect<R2, never, X>, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E, A> => ensuring_(self, f)
}
