// ets_tracing: off

import type { Managed } from "../definition"
import type * as T from "./_internal/effect"
import * as Ex from "./_internal/exit"
import { fromEffect } from "./fromEffect"
import { onExitFirst_ } from "./onExitFirst"

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release will be
 * performed uninterruptibly.
 */
export function acquireReleaseInterruptibleWith_<R, R1, E, A>(
  acquire: T.Effect<R, E, A>,
  release: (a: A) => T.Effect<R1, never, any>,
  __trace?: string
): Managed<R & R1, E, A> {
  return onExitFirst_(fromEffect(acquire), Ex.forEach(release))
}

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release will be
 * performed uninterruptibly.
 *
 * @ets_data_First acquireReleaseInterruptibleWith_
 */
export function acquireReleaseInterruptibleWith<A, R1>(
  release: (a: A) => T.Effect<R1, never, any>,
  __trace?: string
) {
  return <R, E>(acquire: T.Effect<R, E, A>): Managed<R & R1, E, A> =>
    acquireReleaseInterruptibleWith_(acquire, release, __trace)
}
