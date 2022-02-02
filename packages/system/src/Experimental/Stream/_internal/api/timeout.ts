// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as T from "../../../../Effect"
import * as M from "../../../../Managed"
import * as O from "../../../../Option"
import type * as C from "../core"
import * as FromPull from "./fromPull"
import * as ToPull from "./toPull"

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
