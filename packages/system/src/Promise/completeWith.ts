// ets_tracing: off

import { succeedWith } from "../Effect/core.js"
import type { IO, UIO } from "../Effect/effect.js"
import type { Promise } from "./promise.js"
import { Done } from "./state.js"

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
 */
export function completeWith<E, A>(io: IO<E, A>) {
  return (promise: Promise<E, A>): UIO<boolean> =>
    succeedWith(() => {
      const state = promise.state.get

      switch (state._tag) {
        case "Done": {
          return false
        }
        case "Pending": {
          promise.state.set(new Done(io))
          state.joiners.forEach((f) => {
            f(io)
          })
          return true
        }
      }
    })
}
