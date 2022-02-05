// ets_tracing: off

import { effectMaybeAsyncInterruptBlockingOn } from "../Effect/effectMaybeAsyncInterrupt.js"
import * as E from "../Either/index.js"
import { interruptJoiner } from "./interruptJoiner.js"
import type { Promise } from "./promise.js"
import { Pending } from "./state.js"

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
