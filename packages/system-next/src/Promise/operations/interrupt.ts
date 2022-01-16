// ets_tracing: off

import type { UIO } from "../../Effect"
import { chain_ } from "../../Effect/operations/chain"
import { fiberId } from "../../Effect/operations/fiberId"
import { interruptAs } from "../../Effect/operations/interruption"
import type { Promise } from "../definition"
import { completeWith_ } from "./completeWith"

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export function interrupt<E, A>(self: Promise<E, A>, __trace?: string): UIO<boolean> {
  return chain_(fiberId, (id) => completeWith_(self, interruptAs(id)), __trace)
}
