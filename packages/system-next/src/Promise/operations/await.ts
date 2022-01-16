// ets_tracing: off

import type { IO } from "../../Effect"
import { asyncInterruptBlockingOn } from "../../Effect/operations/asyncInterrupt"
import * as E from "../../Either"
import type { Promise } from "../../Promise"
import { Pending } from "../state"
import { interruptJoiner_ } from "./interruptJoiner"

function wait<E, A>(self: Promise<E, A>, __trace?: string): IO<E, A> {
  return asyncInterruptBlockingOn(
    (k) => {
      const state = self.state.get

      switch (state._tag) {
        case "Done": {
          return E.right(state.value)
        }
        case "Pending": {
          self.state.set(new Pending([k, ...state.joiners]))
          return E.left(interruptJoiner_(self, k))
        }
      }
    },
    self.blockingOn,
    __trace
  )
}

export { wait as await }
