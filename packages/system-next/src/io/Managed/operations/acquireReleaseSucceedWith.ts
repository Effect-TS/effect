import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action. The acquire and release
 * actions will be performed uninterruptibly.
 *
 * @ets static ets/ManagedOps acquireReleaseSucceedWith
 */
export function acquireReleaseSucceedWith_<A>(
  acquire: LazyArg<A>,
  release: (a: A) => any,
  __etsTrace?: string
): Managed<unknown, never, A> {
  return Managed.acquireReleaseWith(Effect.succeed(acquire), (a) =>
    Effect.succeed(release(a))
  )
}

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action. The acquire and release
 * actions will be performed uninterruptibly.
 *
 * @ets_data_first acquireReleaseSucceedWith_
 */
export function acquireReleaseSucceedWith<A>(
  release: (a: A) => any,
  __etsTrace?: string
) {
  return (acquire: LazyArg<A>): Managed<unknown, never, A> =>
    acquireReleaseSucceedWith_(acquire, release)
}
