import type { Exit } from "../../Exit/definition"
import type { Managed } from "../definition"
import type * as T from "./_internal/effect"
import { acquireReleaseExitWith_ } from "./acquireReleaseExitWith"

/**
 * Lifts an `Effect<R, E, A>` into `Managed<R, E, A>` with a release action that
 * does not need access to the resource but handles `Exit`. The acquire and
 * release actions will be performed uninterruptibly.
 */
export function acquireReleaseExit_<R, R1, E, A>(
  acquire: T.Effect<R, E, A>,
  release: (exit: Exit<any, any>) => T.Effect<R1, never, any>,
  __trace?: string
): Managed<R & R1, E, A> {
  return acquireReleaseExitWith_(acquire, (_, exit) => release(exit), __trace)
}

/**
 * Lifts an `Effect<R, E, A>` into `Managed<R, E, A>` with a release action that
 * does not need access to the resource but handles `Exit`. The acquire and
 * release actions will be performed uninterruptibly.
 *
 * @ets_data_first acquireReleaseExit_
 */
export function acquireReleaseExit<R1>(
  release: (exit: Exit<any, any>) => T.Effect<R1, never, any>,
  __trace?: string
) {
  return <R, E, A>(acquire: T.Effect<R, E, A>): Managed<R & R1, E, A> =>
    acquireReleaseExit_(acquire, release, __trace)
}
