import type { IO, UIO } from "../../Effect"
import type { Promise } from "../definition"

/**
 * Completes the promise with the result of the specified effect. If the
 * promise has already been completed, the method will produce false.
 *
 * Note that `Promise.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 *
 * @tsplus fluent ets/Promise complete
 */
export function complete_<E, A>(
  self: Promise<E, A>,
  effect: IO<E, A>,
  __tsplusTrace?: string
): UIO<boolean> {
  return effect.intoPromise(self)
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
export function complete<E, A>(effect: IO<E, A>, __tsplusTrace?: string) {
  return (self: Promise<E, A>): UIO<boolean> => self.complete(effect)
}
