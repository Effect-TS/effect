// ets_tracing: off

import type { UIO } from "../../Effect"
import { die as effectDie } from "../../Effect/operations/die"
import type { Promise } from "../definition"
import { completeWith_ } from "./completeWith"

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function die_<E, A>(
  self: Promise<E, A>,
  e: unknown,
  __trace?: string
): UIO<boolean> {
  return completeWith_(self, effectDie(e), __trace)
}

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @ets_data_first die_
 */
export function die(e: unknown, __trace?: string) {
  return <E, A>(self: Promise<E, A>): UIO<boolean> => die_(self, e, __trace)
}
