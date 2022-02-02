import { Effect } from "../../Effect"
import type { Exit } from "../definition"

/**
 * Converts the `Exit` to an `Effect`.
 *
 * @tsplus fluent ets/Exit toEffect
 */
export function toEffect<E, A>(
  self: Exit<E, A>,
  __etsTrace?: string
): Effect<unknown, E, A> {
  switch (self._tag) {
    case "Failure":
      return Effect.failCause(self.cause)
    case "Success":
      return Effect.succeed(self.value)
  }
}
