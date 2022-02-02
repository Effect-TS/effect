// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import type * as CL from "../../../../Clock/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as CatchSomeCause from "./catchSomeCause.js"
import * as TimeoutFailCause from "./timeoutFailCause.js"

export const StreamTimeoutSymbol: unique symbol = Symbol.for(
  "@matechs/core/symbols/errors/StreamTimeout"
)

export class StreamTimeoutError {
  readonly [StreamTimeoutSymbol] = "StreamTimeoutError"

  constructor(readonly message?: string) {}
}

export const isStreamTimeoutError = (u: unknown): u is StreamTimeoutError =>
  u instanceof StreamTimeoutError && u[StreamTimeoutSymbol] === "StreamTimeoutError"

/**
 * Switches the stream if it does not produce a value after d duration.
 */
export function timeoutTo_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  d: number,
  that: C.Stream<R1, E1, A1>
): C.Stream<R & CL.HasClock & R1, E | E1, A | A1> {
  return CatchSomeCause.catchSomeCause_(
    TimeoutFailCause.timeoutFailCause_(self, CS.die(new StreamTimeoutError()), d),
    (e) => {
      if (e._tag === "Die") {
        return O.some(that)
      }

      return O.none
    }
  )
}

/**
 * Switches the stream if it does not produce a value after d duration.
 *
 * @ets_data_first timeoutTo_
 */
export function timeoutTo<R1, E1, A1>(d: number, that: C.Stream<R1, E1, A1>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => timeoutTo_(self, d, that)
}
