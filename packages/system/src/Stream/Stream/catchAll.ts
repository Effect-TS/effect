// ets_tracing: off

import * as C from "../../Cause/index.js"
import * as E from "../../Either/index.js"
import { catchAllCause_ } from "./catchAllCause.js"
import type { Stream } from "./definitions.js"
import { halt } from "./halt.js"

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll_<R, R1, E, E2, O, O1>(
  self: Stream<R, E, O>,
  f: (e: E) => Stream<R1, E2, O1>
): Stream<R & R1, E2, O | O1> {
  return catchAllCause_(self, (c) => E.fold_(C.failureOrCause(c), f, halt))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll<R1, E, E2, O, O1>(f: (e: E) => Stream<R1, E2, O1>) {
  return <R>(self: Stream<R, E, O>) => catchAll_(self, f)
}
