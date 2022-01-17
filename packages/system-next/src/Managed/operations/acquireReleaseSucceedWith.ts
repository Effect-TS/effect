import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { acquireReleaseWith_ } from "./acquireReleaseWith"

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action. The acquire and release
 * actions will be performed uninterruptibly.
 */
export function acquireReleaseSucceedWith_<A>(
  acquire: () => A,
  release: (a: A) => any,
  __trace?: string
): Managed<unknown, never, A> {
  return acquireReleaseWith_(
    T.succeed(acquire),
    (a) => T.succeed(() => release(a)),
    __trace
  )
}

/**
 * Lifts a synchronous effect that does not throw exceptions into a
 * `Managed<unknown, never, A>` with a release action. The acquire and release
 * actions will be performed uninterruptibly.
 *
 * @ets_data_first acquireReleaseSucceedWith_
 */
export function acquireReleaseSucceedWith<A>(release: (a: A) => any, __trace?: string) {
  return (acquire: () => A): Managed<unknown, never, A> =>
    acquireReleaseSucceedWith_(acquire, release, __trace)
}
