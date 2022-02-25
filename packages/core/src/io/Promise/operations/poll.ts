import { Option } from "../../../data/Option"
import type { IO, UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Promise } from "../definition"

/**
 * Checks for completion of this `Promise`. Returns the result effect if this
 * promise has already been completed or a `None` otherwise.
 *
 * @tsplus fluent ets/Promise poll
 */
export function poll<E, A>(
  self: Promise<E, A>,
  __tsplusTrace?: string
): UIO<Option<IO<E, A>>> {
  return Effect.succeed(() => {
    const state = self.state.get
    switch (state._tag) {
      case "Pending": {
        return Option.none
      }
      case "Done": {
        return Option.some(state.value)
      }
    }
  })
}
