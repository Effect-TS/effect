// tracing: off

import { chain_ } from "../Effect/core"
import { fiberId } from "../Effect/fiberId"
import { interruptAs as effectInterruptAs } from "../Effect/interruption"
import { completeWith } from "./completeWith"
import type { Promise } from "./promise"

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export function interrupt<E, A>(promise: Promise<E, A>) {
  return chain_(fiberId, (id) => completeWith<E, A>(effectInterruptAs(id))(promise))
}
