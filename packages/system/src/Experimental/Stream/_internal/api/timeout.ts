// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import * as T from "../../../../Effect/index.js"
import * as M from "../../../../Managed/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as FromPull from "./fromPull.js"
import * as ToPull from "./toPull.js"

/**
 * Ends the stream if it does not produce a value after d duration.
 */
export function timeout_<R, E, A>(
  self: C.Stream<R, E, A>,
  d: number
): C.Stream<R & CL.HasClock, E, A> {
  return FromPull.fromPull(
    M.map_(ToPull.toPull(self), (pull) => T.timeoutFail_(pull, d, () => O.none))
  )
}

/**
 * Ends the stream if it does not produce a value after d duration.
 *
 * @ets_data_first timeout_
 */
export function timeout(d: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => timeout_(self, d)
}
