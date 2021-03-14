// tracing: off

import { effectTotal } from "../Effect/core"
import type { Promise } from "./promise"

/**
 * Checks for completion of this Promise. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 */
export function isDone<E, A>(promise: Promise<E, A>) {
  return effectTotal(() => promise.state.get._tag === "Done")
}
