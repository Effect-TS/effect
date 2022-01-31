// ets_tracing: off

import * as CS from "../../../../Cause"
import type * as CL from "../../../../Clock"
import * as T from "../../../../Effect"
import * as M from "../../../../Managed"
import * as O from "../../../../Option"
import type * as C from "../core.js"
import * as FromPull from "./fromPull.js"
import * as ToPull from "./toPull.js"

/**
 * Fails the stream with given cause if it does not produce a value after d duration.
 */
export function timeoutFailCause_<R, E, E1, A>(
  self: C.Stream<R, E, A>,
  cause: CS.Cause<E1>,
  d: number
): C.Stream<R & CL.HasClock, E | E1, A> {
  return FromPull.fromPull(
    M.map_(ToPull.toPull(self), (pull) =>
      T.timeoutFailCause_(pull, () => CS.map_(cause, (_) => O.some<E | E1>(_)), d)
    )
  )
}

/**
 * Fails the stream with given cause if it does not produce a value after d duration.
 *
 * @ets_data_first timeoutFailCause_
 */
export function timeoutFailCause<E1>(cause: CS.Cause<E1>, d: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => timeoutFailCause_(self, cause, d)
}
