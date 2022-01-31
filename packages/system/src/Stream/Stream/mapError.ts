// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError_<R, E, E2, O>(
  self: Stream<R, E, O>,
  f: (e: E) => E2
): Stream<R, E2, O> {
  return new Stream(pipe(self.proc, M.map(T.mapError(O.map(f)))))
}

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError<E, E2>(f: (e: E) => E2) {
  return <R, O>(self: Stream<R, E, O>) => mapError_(self, f)
}
