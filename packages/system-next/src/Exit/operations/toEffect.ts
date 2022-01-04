// ets_tracing: off

import * as T from "../../Effect"
import type { Exit } from "../definition"

/**
 * Converts the `Exit` to an `Effect`.
 */
export function toEffect<E, A>(self: Exit<E, A>): T.IO<E, A> {
  switch (self._tag) {
    case "Failure":
      return T.failCause(self.cause)
    case "Success":
      return T.succeed(self.value)
  }
}
