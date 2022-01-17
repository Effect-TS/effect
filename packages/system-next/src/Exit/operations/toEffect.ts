import type { IO } from "../../Effect/definition/base"
import { failCause } from "../../Effect/operations/failCause"
import { succeedNow } from "../../Effect/operations/succeedNow"
import type { Exit } from "../definition"

/**
 * Converts the `Exit` to an `Effect`.
 */
export function toEffect<E, A>(self: Exit<E, A>): IO<E, A> {
  switch (self._tag) {
    case "Failure":
      return failCause(self.cause)
    case "Success":
      return succeedNow(self.value)
  }
}
