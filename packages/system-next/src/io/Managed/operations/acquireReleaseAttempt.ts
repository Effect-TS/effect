import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Lifts a synchronous effect into `Managed<unknown, unknown, A>` with a release
 * action that does not need access to the resource. The acquire and release
 * actions will be performed uninterruptibly.
 *
 * @ets static ets/ManagedOps acquireReleaseAttempt
 */
export function acquireReleaseAttempt<A, X>(
  acquire: LazyArg<A>,
  release: LazyArg<X>,
  __etsTrace?: string
): Managed<unknown, unknown, A> {
  return Managed.acquireReleaseWith(Effect.attempt(acquire), () =>
    Effect.attempt(release).orDie()
  )
}
