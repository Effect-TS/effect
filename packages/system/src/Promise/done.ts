// ets_tracing: off

import { done as effectDone } from "../Effect/done.js"
import type { Exit } from "../Exit/exit.js"
import { completeWith } from "./completeWith.js"
import type { Promise } from "./promise.js"

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function done<E, A>(e: Exit<E, A>) {
  return (promise: Promise<E, A>) => completeWith<E, A>(effectDone(e))(promise)
}
