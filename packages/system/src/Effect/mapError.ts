// tracing: off

import { map } from "../Cause/core"
import { pipe } from "../Function"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 */
export function mapError_<R, E, E2, A>(
  self: Effect<R, E, A>,
  f: (e: E) => E2,
  __trace?: string
) {
  return foldCauseM_(
    self,
    (c) => pipe(c, map(f), halt),
    (a) => succeed(a),
    __trace
  )
}

/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @dataFirst mapError_
 */
export function mapError<E, E2>(f: (e: E) => E2, __trace?: string) {
  return <R, A>(self: Effect<R, E, A>) => mapError_(self, f, __trace)
}
