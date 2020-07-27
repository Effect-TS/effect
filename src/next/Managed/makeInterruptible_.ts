import * as T from "./deps"
import { fromEffect } from "./fromEffect"
import { onExitFirst_ } from "./onExitFirst_"

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export const makeInterruptible_ = <S, R, E, A, S1, R1>(
  acquire: T.Effect<S, R, E, A>,
  release: (a: A) => T.Effect<S1, R1, never, unknown>
) =>
  onExitFirst_(fromEffect(acquire), (e) => {
    switch (e._tag) {
      case "Failure": {
        return T.unit
      }
      case "Success": {
        return release(e.value)
      }
    }
  })
