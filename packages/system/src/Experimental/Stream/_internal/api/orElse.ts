// ets_tracing: off

import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElse_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>
): C.Stream<R & R1, E | E1, A | A1> {
  return new C.Stream<R & R1, E | E1, A | A1>(CH.orElse_(self.channel, that.channel))
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 *
 * @ets_data_first orElse_
 */
export function orElse<R1, E1, A1>(that: C.Stream<R1, E1, A1>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => orElse_(self, that)
}
