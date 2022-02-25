import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action that does not need
 * access to the resource. The acquire and release actions will be performed
 * uninterruptibly.
 *
 * @tsplus static ets/ManagedOps acquireReleaseSucceed
 */
export function acquireReleaseSucceed<A, X>(
  acquire: LazyArg<A>,
  release: LazyArg<X>,
  __tsplusTrace?: string
): Managed<unknown, never, A> {
  return Managed.acquireReleaseSucceedWith(acquire, release)
}
