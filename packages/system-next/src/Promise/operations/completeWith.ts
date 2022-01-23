import type { IO, UIO } from "../../Effect"
import { succeed } from "../../Effect/operations/succeed"
import { Done } from "../_internal/state"
import type { Promise } from "../definition"

/**
 * Completes the promise with the specified effect. If the promise has
 * already been completed, the method will produce false.
 *
 * Note that since the promise is completed with an effect, the effect will
 * be evaluated each time the value of the promise is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case te meaning of the "exactly once" guarantee of `Promise` is that the
 * promise can be completed with exactly one effect. For a version that
 * completes the promise with the result of an effect see `Promise.complete`.
 */
export function completeWith_<E, A>(
  self: Promise<E, A>,
  io: IO<E, A>,
  __trace?: string
): UIO<boolean> {
  return succeed(() => {
    const state = self.state.get

    switch (state._tag) {
      case "Done": {
        return false
      }
      case "Pending": {
        self.state.set(new Done(io))
        state.joiners.forEach((f) => {
          f(io)
        })
        return true
      }
    }
  }, __trace)
}

/**
 * Completes the promise with the specified effect. If the promise has
 * already been completed, the method will produce false.
 *
 * Note that since the promise is completed with an effect, the effect will
 * be evaluated each time the value of the promise is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case te meaning of the "exactly once" guarantee of `Promise` is that the
 * promise can be completed with exactly one effect. For a version that
 * completes the promise with the result of an effect see
 * `Promise.complete`.
 *
 * @ets_data_first completeWith_
 */
export function completeWith<E, A>(io: IO<E, A>, __trace?: string) {
  return (self: Promise<E, A>): UIO<boolean> => completeWith_(self, io, __trace)
}
