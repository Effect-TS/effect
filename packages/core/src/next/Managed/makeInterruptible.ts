import * as T from "./deps"
import { fromEffect } from "./fromEffect"
import { onExitFirst_ } from "./onExitFirst_"

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export const makeInterruptible = <A, S1, R1>(
  release: (a: A) => T.Effect<S1, R1, never, unknown>
) => <S, R, E>(acquire: T.Effect<S, R, E, A>) =>
  onExitFirst_(fromEffect(acquire), T.exitForeach(release))
