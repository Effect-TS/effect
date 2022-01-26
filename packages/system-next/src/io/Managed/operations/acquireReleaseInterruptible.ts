import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action
 * that does not require access to the resource. The acquire action will be
 * performed interruptibly, while release will be performed uninterruptibly.
 *
 * @ets static ets/ManagedOps acquireReleaseInterruptible
 */
export function acquireReleaseInterruptible_<R, R1, E, A>(
  acquire: Effect<R, E, A>,
  release: Effect<R1, never, any>,
  __etsTrace?: string
): Managed<R & R1, E, A> {
  return Managed.acquireReleaseInterruptibleWith(acquire, () => release)
}

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action
 * that does not require access to the resource. The acquire action will be
 * performed interruptibly, while release will be performed uninterruptibly.
 *
 * @ets_data_first acquireReleaseInterruptible_
 */
export function acquireReleaseInterruptible<R1>(
  release: Effect<R1, never, any>,
  __etsTrace?: string
) {
  return <R, E, A>(acquire: Effect<R, E, A>): Managed<R & R1, E, A> =>
    acquireReleaseInterruptible_(acquire, release)
}
