// ets_tracing: off

import * as O from "../../Option/index.js"
import { catchAll_ } from "./catchAll.js"
import type { Stream } from "./definitions.js"
import { fail } from "./fail.js"

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome_<R, R1, E, E1, O, O1>(
  self: Stream<R, E, O>,
  f: (e: E) => O.Option<Stream<R1, E1, O1>>
): Stream<R & R1, E | E1, O | O1> {
  return catchAll_(self, (e) => O.getOrElse_(f(e), () => fail<E | E1>(e)))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome<R, R1, E, E1, O, O1>(
  f: (e: E) => O.Option<Stream<R1, E1, O1>>
) {
  return <R>(self: Stream<R, E, O>) => catchSome_(self, f)
}
