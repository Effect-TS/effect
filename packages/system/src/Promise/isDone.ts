import { effectTotal } from "../Effect/core"

import { Promise } from "./promise"

/**
 * Checks for completion of this Promise. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 */
export const isDone = <E, A>(promise: Promise<E, A>) =>
  effectTotal(() => promise.state.get._tag === "Done")
