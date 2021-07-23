// ets_tracing: off

import { effectMaybeAsyncInterruptBlockingOn } from "../Effect/effectMaybeAsyncInterrupt"
import * as E from "../Either"
import { interruptJoiner } from "./interruptJoiner"
import type { Promise } from "./promise"
import { Pending } from "./state"

/**
 * Retrieves the value of the promise, suspending the fiber running the action
 * until the result is available.
 */
function wait<E, A>(promise: Promise<E, A>) {
  return effectMaybeAsyncInterruptBlockingOn<unknown, E, A>((k) => {
    const state = promise.state.get

    switch (state._tag) {
      case "Done": {
        return E.right(state.value)
      }
      case "Pending": {
        promise.state.set(new Pending([k, ...state.joiners]))
        return E.left(interruptJoiner(k)(promise))
      }
    }
  }, promise.blockingOn)
}

export { wait as await }
