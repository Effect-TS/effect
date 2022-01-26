import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action that does not need
 * access to the resource. The acquire and release actions will be performed
 * uninterruptibly.
 *
 * @ets static ets/ManagedOps acquireReleaseSucceed
 */
export function acquireReleaseSucceed_<A, X>(
  acquire: LazyArg<A>,
  release: LazyArg<X>,
  __etsTrace?: string
): Managed<unknown, never, A> {
  return Managed.acquireReleaseSucceedWith(acquire, release)
}

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action that does not need
 * access to the resource. The acquire and release actions will be performed
 * uninterruptibly.
 *
 * @ets_data_first acquireReleaseSucceed_
 */
export function acquireReleaseSucceed<X>(release: LazyArg<X>, __etsTrace?: string) {
  return <A>(acquire: LazyArg<A>): Managed<unknown, never, A> =>
    acquireReleaseSucceed_(acquire, release)
}
