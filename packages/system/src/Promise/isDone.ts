// ets_tracing: off

import { succeedWith } from "../Effect/core.js"
import type { Promise } from "./promise.js"

/**
 * Checks for completion of this Promise. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 */
export function isDone<E, A>(promise: Promise<E, A>) {
  return succeedWith(() => promise.state.get._tag === "Done")
}
