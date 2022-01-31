// ets_tracing: off

import * as O from "../Option/index.js"
import { chain_, succeed, succeedWith } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Requires that the given `Effect<R, E, Option<A>>` contain a value. If there is no
 * value, then the specified error will be raised.
 *
 * @ets_data_first require_
 */
function _require<E>(error: () => E, __trace?: string) {
  return <R, A>(io: Effect<R, E, O.Option<A>>) => require_(io, error, __trace)
}

/**
 * Requires that the given `Effect<R, E, Option<A>>` contain a value. If there is no
 * value, then the specified error will be raised.
 */
export function require_<R, A, E>(
  io: Effect<R, E, O.Option<A>>,
  error: () => E,
  __trace?: string
) {
  return chain_(
    io,
    O.fold(() => chain_(succeedWith(error), fail), succeed),
    __trace
  )
}

export { _require as require }
