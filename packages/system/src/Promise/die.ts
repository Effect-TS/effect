// ets_tracing: off

import { die as effectDie } from "../Effect/die.js"
import { completeWith } from "./completeWith.js"
import type { Promise } from "./promise.js"

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function die(e: unknown) {
  return <E, A>(promise: Promise<E, A>) => completeWith<E, A>(effectDie(e))(promise)
}
