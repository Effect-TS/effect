import type { Effect } from "../definition"
import { IEnsuring } from "../definition"

/**
 * Returns an effect that, if this effect _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this effect
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the effect's result, see `onExit`.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `acquireReleaseWith`.
 *
 * @tsplus fluent ets/Effect ensuring
 */
export function ensuring_<R, E, A, R1, X>(
  self: Effect<R, E, A>,
  finalizer: Effect<R1, never, X>,
  __etsTrace?: string
): Effect<R & R1, E, A> {
  return new IEnsuring(self, finalizer, __etsTrace)
}

/**
 * Returns an effect that, if this effect _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this effect
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the effect's result, see `onExit`.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `acquireReleaseWith`.
 *
 * @ets_data_first ensuring_
 */
export function ensuring<R1, X>(finalizer: Effect<R1, never, X>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R1, E, A> =>
    ensuring_(self, finalizer)
}
