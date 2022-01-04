// ets_tracing: off

import * as C from "../../Cause"
import type { Exit } from "../definition"

/**
 * Determines if the `Exit` result is interrupted.
 */
export function isInterrupted<E, A>(self: Exit<E, A>): boolean {
  switch (self._tag) {
    case "Failure":
      return C.isInterrupted(self.cause)
    case "Success":
      return false
  }
}
