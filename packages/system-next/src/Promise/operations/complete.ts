// ets_tracing: off

import type { IO, UIO } from "../../Effect"
import { intoPromise_ } from "../../Effect/operations/intoPromise"
import type { Promise } from "../definition"

/**
 * Completes the promise with the result of the specified effect. If the
 * promise has already been completed, the method will produce false.
 *
 * Note that `Promise.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 */
export function complete_<E, A>(
  self: Promise<E, A>,
  io: IO<E, A>,
  __trace?: string
): UIO<boolean> {
  return intoPromise_(io, self, __trace)
}

/**
 * Completes the promise with the result of the specified effect. If the
 * promise has already been completed, the method will produce false.
 *
 * Note that `Promise.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 *
 * @ets_data_first complete_
 */
export function complete<E, A>(io: IO<E, A>, __trace?: string) {
  return (self: Promise<E, A>): UIO<boolean> => complete_(self, io, __trace)
}
