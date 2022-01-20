// ets_tracing: off

import type { Managed } from "../definition"
import type * as T from "./_internal/effect"
import { acquireReleaseInterruptibleWith_ } from "./acquireReleaseInterruptibleWith"

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action
 * that does not require access to the resource. The acquire action will be
 * performed interruptibly, while release will be performed uninterruptibly.
 */
export function acquireReleaseInterruptible_<R, R1, E, A>(
  acquire: T.Effect<R, E, A>,
  release: T.Effect<R1, never, any>,
  __trace?: string
): Managed<R & R1, E, A> {
  return acquireReleaseInterruptibleWith_(acquire, () => release, __trace)
}

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action
 * that does not require access to the resource. The acquire action will be
 * performed interruptibly, while release will be performed uninterruptibly.
 *
 * @ets_data_first acquireReleaseInterruptible_
 */
export function acquireReleaseInterruptible<R1>(
  release: T.Effect<R1, never, any>,
  __trace?: string
) {
  return <R, E, A>(acquire: T.Effect<R, E, A>): Managed<R & R1, E, A> =>
    acquireReleaseInterruptible_(acquire, release, __trace)
}
