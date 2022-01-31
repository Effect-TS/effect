// ets_tracing: off

import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError_<R, E, E1, A>(
  self: C.Stream<R, E, A>,
  f: (e: E) => E1
): C.Stream<R, E1, A> {
  return new C.Stream(CH.mapError_(self.channel, f))
}

/**
 * Transforms the errors emitted by this stream using `f`.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <R, A>(self: C.Stream<R, E, A>) => mapError_(self, f)
}
