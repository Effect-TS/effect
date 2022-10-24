import type { Duration } from "@fp-ts/data/Duration"
import * as Option from "@fp-ts/data/Option"

/**
 * @category symbol
 * @since 1.0.0
 */
export const StreamTimeoutErrorSym = Symbol.for(
  "@effect/core/stream/Stream/StreamTimeoutError"
)

/**
 * @category errors
 * @since 1.0.0
 */
export class StreamTimeoutError {
  readonly [StreamTimeoutErrorSym] = "StreamTimeoutError"
  constructor(readonly message?: string) {}
}

/**
 * @category refinements
 * @since 1.0.0
 */
export function isStreamTimeoutError(u: unknown): u is StreamTimeoutError {
  return (
    u instanceof StreamTimeoutError && u[StreamTimeoutErrorSym] === "StreamTimeoutError"
  )
}

/**
 * Switches the stream if it does not produce a value after the spcified
 * duration.
 *
 * @tsplus static effect/core/stream/Stream.Aspects timeoutTo
 * @tsplus pipeable effect/core/stream/Stream timeoutTo
 * @category mutations
 * @since 1.0.0
 */
export function timeoutTo<R2, E2, A2>(duration: Duration, that: Stream<R2, E2, A2>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A | A2> =>
    self
      .timeoutFailCause(Cause.die(new StreamTimeoutError()), duration)
      .catchSomeCause((cause) =>
        cause.isDieType() && isStreamTimeoutError(cause.value)
          ? Option.some(that)
          : Option.none
      )
}
