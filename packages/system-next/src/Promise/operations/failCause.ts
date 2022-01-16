// ets_tracing: off

import type { Cause } from "../../Cause"
import type { UIO } from "../../Effect"
import { failCause as effectFailCause } from "../../Effect/operations/failCause"
import type { Promise } from ".."
import { completeWith_ } from "./completeWith"

/**
 * Fails the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function failCause_<E, A>(
  self: Promise<E, A>,
  cause: Cause<E>,
  __trace?: string
): UIO<boolean> {
  return completeWith_(self, effectFailCause(cause), __trace)
}

/**
 * Fails the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @ets_data_first failCause_
 */
export function failCause<E>(cause: Cause<E>, __trace?: string) {
  return <A>(self: Promise<E, A>): UIO<boolean> => failCause_(self, cause, __trace)
}
