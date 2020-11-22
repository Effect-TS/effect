import type * as C from "../../Cause"
import * as O from "../../Option"
import { catchAllCause_ } from "./catchAllCause"
import type { Stream } from "./definitions"
import { halt } from "./halt"

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause_<R, R1, E, E1, O extends O1, O1>(
  self: Stream<R, E, O>,
  f: (c: C.Cause<E>) => O.Option<Stream<R1, E1, O1>>
): Stream<R & R1, E | E1, O1> {
  return catchAllCause_(self, (cause) =>
    O.getOrElse_(f(cause), () => halt<E | E1>(cause))
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause<R1, E, E1, O extends O1, O1>(
  f: (c: C.Cause<E>) => O.Option<Stream<R1, E1, O1>>
) {
  return <R>(self: Stream<R, E, O>) => catchSomeCause_(self, f)
}
