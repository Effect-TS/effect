import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Lifts a synchronous effect into `Managed<unknown, unknown, A>` with a release
 * action. The acquire and release actions will be performed uninterruptibly.
 *
 * @tsplus static ets/ManagedOps acquireReleaseAttemptWith
 */
export function acquireReleaseAttemptWith<A, X>(
  acquire: LazyArg<A>,
  release: (a: A) => X,
  __etsTrace?: string
): Managed<unknown, unknown, A> {
  return Managed.acquireReleaseWith(Effect.attempt(acquire), (a) =>
    Effect.attempt(release(a)).orDie()
  )
}
