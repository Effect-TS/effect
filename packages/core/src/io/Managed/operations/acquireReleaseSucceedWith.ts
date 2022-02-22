import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action. The acquire and release
 * actions will be performed uninterruptibly.
 *
 * @tsplus static ets/ManagedOps acquireReleaseSucceedWith
 */
export function acquireReleaseSucceedWith<A, X>(
  acquire: LazyArg<A>,
  release: (a: A) => X,
  __etsTrace?: string
): Managed<unknown, never, A> {
  return Managed.acquireReleaseWith(Effect.succeed(acquire), (a) =>
    Effect.succeed(release(a))
  )
}
