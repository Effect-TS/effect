// ets_tracing: off

import { succeedWith } from "../Effect/core.js"
import * as O from "../Option/index.js"
import type { Promise } from "./promise.js"

/**
 * Checks for completion of this Promise. Returns the result effect if this
 * promise has already been completed or a `None` otherwise.
 */
export function poll<E, A>(promise: Promise<E, A>) {
  return succeedWith(() => {
    const state = promise.state.get

    switch (state._tag) {
      case "Done": {
        return O.some(state.value)
      }
      case "Pending": {
        return O.none
      }
    }
  })
}
