// tracing: off

import { succeed } from "./core"
import type { Effect, RIO } from "./effect"
import { foldM_ } from "./foldM"

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @trace 1
 * @trace 2
 */
export function fold_<R, E, A, A2, A3>(
  value: Effect<R, E, A>,
  failure: (failure: E) => A2,
  success: (a: A) => A3,
  __trace?: string
): Effect<R, never, A2 | A3> {
  return foldM_(
    value,
    (e) => succeed(failure(e)),
    (a) => succeed(success(a)),
    __trace
  )
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @dataFirst fold_
 */
export function fold<E, A, A2, A3>(
  failure: (failure: E) => A2,
  success: (a: A) => A3,
  __trace?: string
) {
  return <R>(value: Effect<R, E, A>): RIO<R, A2 | A3> =>
    fold_(value, failure, success, __trace)
}
