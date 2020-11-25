import { succeed } from "./core"
import type { Effect, RIO } from "./effect"
import { foldM_ } from "./foldM"

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold<E, A, A2, A3>(failure: (failure: E) => A2, success: (a: A) => A3) {
  return <R>(value: Effect<R, E, A>): RIO<R, A2 | A3> =>
    foldM_(
      value,
      (e) => succeed(failure(e)),
      (a) => succeed(success(a))
    )
}
