// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as RunForEach from "./runForEach.js"

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function forEach_<R, R1, E, E1, A, X>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, X>
): T.Effect<R & R1, E | E1, void> {
  return RunForEach.runForEach_(self, f)
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 *
 * @ets_data_first forEach_
 */
export function forEach<R1, E1, A, X>(f: (a: A) => T.Effect<R1, E1, X>) {
  return <R, E>(self: C.Stream<R, E, A>) => forEach_(self, f)
}
