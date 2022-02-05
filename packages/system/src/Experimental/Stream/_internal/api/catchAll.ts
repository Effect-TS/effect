// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as E from "../../../../Either/index.js"
import type * as C from "../core.js"
import * as CatchAllCause from "./catchAllCause.js"
import * as FailCause from "./failCause.js"

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  f: (e: E) => C.Stream<R1, E1, A1>
): C.Stream<R & R1, E1, A | A1> {
  return CatchAllCause.catchAllCause_(self, (_) =>
    E.fold_(CS.failureOrCause(_), f, (_) => FailCause.failCause(_))
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<R1, E, E1, A1>(f: (e: E) => C.Stream<R1, E1, A1>) {
  return <R, A>(self: C.Stream<R, E, A>) => catchAll_(self, f)
}
