// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as SK from "../../Sink/index.js"
import type * as C from "../core.js"
import * as PipeThrough from "./pipeThrough.js"

/**
 * Drops all elements of the stream for as long as the specified predicate
 * produces an effect that evalutates to `true`
 *
 * @see `dropWhile`
 */
export function dropWhileEffect_<R, R1, E, E1, A>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, boolean>
): C.Stream<R & R1, E | E1, A> {
  return PipeThrough.pipeThrough(self, SK.dropWhileEffect<R1, E | E1, A>(f))
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * produces an effect that evalutates to `true`
 *
 * @see `dropWhile`
 *
 * @ets_data_first dropWhileEffect_
 */
export function dropWhileEffect<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: C.Stream<R, E, A>) => dropWhileEffect_(self, f)
}
