// ets_tracing: off

import type * as C from "../../Cause/index.js"
import * as O from "../../Option/index.js"
import { catchAllCause_ } from "./catchAllCause.js"
import type { Stream } from "./definitions.js"
import { halt } from "./halt.js"

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause_<R, R1, E, E1, O, O1>(
  self: Stream<R, E, O>,
  f: (c: C.Cause<E>) => O.Option<Stream<R1, E1, O1>>
): Stream<R & R1, E | E1, O | O1> {
  return catchAllCause_(self, (cause) =>
    O.getOrElse_(f(cause), () => halt<E | E1>(cause))
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause<R1, E, E1, O, O1>(
  f: (c: C.Cause<E>) => O.Option<Stream<R1, E1, O1>>
) {
  return <R>(self: Stream<R, E, O>) => catchSomeCause_(self, f)
}
