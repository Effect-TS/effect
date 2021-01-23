import * as C from "../../Cause"
import type * as CL from "../../Clock"
import { pipe } from "../../Function"
import * as O from "../../Option"
import { catchSome } from "./catchSome"
import type { Stream } from "./definitions"
import { timeoutErrorCause } from "./timeoutErrorCause"

export const StreamTimeoutSymbol: unique symbol = Symbol.for(
  "@matechs/core/Stream/Stream/timeoutTo/StreamTimeout"
)

export class StreamTimeoutError extends Error {
  readonly [StreamTimeoutSymbol] = "StreamTimeoutError"

  constructor(message?: string) {
    super(message)

    this.name = this[StreamTimeoutSymbol]
  }
}

export const isStreamTimeout = (u: unknown): u is StreamTimeoutError =>
  u instanceof Error && u[StreamTimeoutSymbol] === "StreamTimeoutError"

/**
 * Switches the stream if it does not produce a value after d duration.
 */
export function timeoutTo(d: number) {
  return <R1, E1, O2>(that: Stream<R1, E1, O2>) => <R, E, O>(
    self: Stream<R, E, O>
  ): Stream<R & CL.HasClock & R1, E1 | E, O2 | O> =>
    pipe(
      self,
      timeoutErrorCause(C.die(new StreamTimeoutError()))(d),
      catchSome((e) => {
        if (isStreamTimeout(e)) {
          return O.some(that)
        }

        return O.none
      })
    )
}
