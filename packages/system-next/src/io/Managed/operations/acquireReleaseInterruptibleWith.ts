import type { Effect } from "../../Effect"
import { forEach as exitForEach } from "../../Exit/operations/forEach"
import { Managed } from "../definition"

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release will be
 * performed uninterruptibly.
 *
 * @ets static ets/ManagedOps acquireReleaseInterruptibleWith
 */
export function acquireReleaseInterruptibleWith_<R, R1, E, A>(
  acquire: Effect<R, E, A>,
  release: (a: A) => Effect<R1, never, any>,
  __etsTrace?: string
): Managed<R & R1, E, A> {
  return Managed.fromEffect(acquire).onExitFirst(exitForEach(release))
}

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release will be
 * performed uninterruptibly.
 *
 * @ets_data_First acquireReleaseInterruptibleWith_
 */
export function acquireReleaseInterruptibleWith<A, R1>(
  release: (a: A) => Effect<R1, never, any>,
  __etsTrace?: string
) {
  return <R, E>(acquire: Effect<R, E, A>): Managed<R & R1, E, A> =>
    acquireReleaseInterruptibleWith_(acquire, release)
}
