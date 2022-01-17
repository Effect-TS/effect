import type { IO, UIO } from "../../Effect"
import { succeed } from "../../Effect/operations/succeed"
import * as O from "../../Option"
import type { Promise } from "../definition"

/**
 * Checks for completion of this `Promise`. Returns the result effect if this
 * promise has already been completed or a `None` otherwise.
 */
export function poll<E, A>(
  self: Promise<E, A>,
  __trace?: string
): UIO<O.Option<IO<E, A>>> {
  return succeed(() => {
    const state = self.state.get
    switch (state._tag) {
      case "Pending": {
        return O.none
      }
      case "Done": {
        return O.some(state.value)
      }
    }
  }, __trace)
}
