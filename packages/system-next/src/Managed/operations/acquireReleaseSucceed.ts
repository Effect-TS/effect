// ets_tracing: off

import type { Managed } from "../definition"
import { acquireReleaseSucceedWith_ } from "./acquireReleaseSucceedWith"

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action that does not need
 * access to the resource. The acquire and release actions will be performed
 * uninterruptibly.
 */
export function acquireReleaseSucceed_<A>(
  acquire: () => A,
  release: () => any,
  __trace?: string
): Managed<unknown, never, A> {
  return acquireReleaseSucceedWith_(acquire, () => release(), __trace)
}

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action that does not need
 * access to the resource. The acquire and release actions will be performed
 * uninterruptibly.
 *
 * @ets_data_first acquireReleaseSucceed_
 */
export function acquireReleaseSucceed(release: () => any, __trace?: string) {
  return <A>(acquire: () => A): Managed<unknown, never, A> =>
    acquireReleaseSucceed_(acquire, release, __trace)
}
