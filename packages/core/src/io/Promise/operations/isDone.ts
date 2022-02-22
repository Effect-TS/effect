import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Promise } from "../definition"

/**
 * Checks for completion of this `Promise`. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 *
 * @tsplus fluent ets/Promise isDone
 */
export function isDone<E, A>(self: Promise<E, A>, __etsTrace?: string): UIO<boolean> {
  return Effect.succeed(self.state.get._tag === "Done")
}
