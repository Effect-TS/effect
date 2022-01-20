import type { UIO } from "../../Effect"
import { succeed } from "../../Effect/operations/succeed"
import type { Promise } from "../definition"

/**
 * Checks for completion of this `Promise`. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 */
export function isDone<E, A>(self: Promise<E, A>, __trace?: string): UIO<boolean> {
  return succeed(() => self.state._tag === "Done")
}
