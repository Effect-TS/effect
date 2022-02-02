import { Either } from "../../../data/Either"
import type { IO } from "../../Effect"
import { Effect } from "../../Effect"
import { PromiseState } from "../_internal/state"
import type { Promise } from "../definition"
import { interruptJoiner } from "./_internal/interruptJoiner"

/**
 * Retrieves the value of the promise, suspending the fiber running the action
 * until the result is available.
 *
 * @tsplus fluent ets/Promise await
 */
export function _await<E, A>(self: Promise<E, A>, __etsTrace?: string): IO<E, A> {
  return Effect.asyncInterruptBlockingOn((k) => {
    const state = self.state.get

    switch (state._tag) {
      case "Done": {
        return Either.right(state.value)
      }
      case "Pending": {
        self.state.set(PromiseState.pending([k, ...state.joiners]))
        return Either.left(interruptJoiner(self, k))
      }
    }
  }, self.blockingOn)
}

export { _await as await }
