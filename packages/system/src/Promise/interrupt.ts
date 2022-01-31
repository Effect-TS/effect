// ets_tracing: off

import { chain_ } from "../Effect/core.js"
import { fiberId } from "../Effect/fiberId.js"
import { interruptAs as effectInterruptAs } from "../Effect/interruption.js"
import { completeWith } from "./completeWith.js"
import type { Promise } from "./promise.js"

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export function interrupt<E, A>(promise: Promise<E, A>) {
  return chain_(fiberId, (id) => completeWith<E, A>(effectInterruptAs(id))(promise))
}
