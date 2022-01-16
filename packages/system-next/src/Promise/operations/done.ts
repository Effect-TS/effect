// ets_tracing: off

import type { UIO } from "../../Effect"
import { done as effectDone } from "../../Effect/operations/done"
import type { Exit } from "../../Exit"
import type { Promise } from "../definition"
import { completeWith_ } from "./completeWith"

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function done_<E, A>(
  self: Promise<E, A>,
  exit: Exit<E, A>,
  __trace?: string
): UIO<boolean> {
  return completeWith_(self, effectDone(exit), __trace)
}

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @ets_data_first die_
 */
export function done<E, A>(exit: Exit<E, A>, __trace?: string) {
  return (self: Promise<E, A>): UIO<boolean> => done_(self, exit, __trace)
}
