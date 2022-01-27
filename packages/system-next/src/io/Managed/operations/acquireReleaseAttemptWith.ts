import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Lifts a synchronous effect into `Managed<unknown, unknown, A>` with a release
 * action. The acquire and release actions will be performed uninterruptibly.
 *
 * @ets static ets/ManagedOps acquireReleaseAttemptWith
 */
export function acquireReleaseAttemptWith_<A, X>(
  acquire: LazyArg<A>,
  release: (a: A) => X,
  __etsTrace?: string
): Managed<unknown, unknown, A> {
  return Managed.acquireReleaseWith(Effect.attempt(acquire), (a) =>
    Effect.attempt(release(a)).orDie()
  )
}

/**
 * Lifts a synchronous effect into `Managed<unknown, unknown, A>` with a release
 * action. The acquire and release actions will be performed uninterruptibly.
 *
 * @ets_data_first acquireReleaseAttemptWith_
 */
export function acquireReleaseAttemptWith<A, X>(
  release: (a: A) => X,
  __etsTrace?: string
) {
  return (acquire: LazyArg<A>): Managed<unknown, unknown, A> =>
    acquireReleaseAttemptWith_(acquire, release)
}
