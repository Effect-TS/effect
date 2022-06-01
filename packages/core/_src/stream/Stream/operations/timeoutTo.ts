export const StreamTimeoutErrorSym = Symbol.for(
  "@effect/core/stream/Stream/StreamTimeoutError"
)

export class StreamTimeoutError {
  readonly [StreamTimeoutErrorSym] = "StreamTimeoutError"
  constructor(readonly message?: string) {}
}

export function isStreamTimeoutError(u: unknown): u is StreamTimeoutError {
  return (
    u instanceof StreamTimeoutError && u[StreamTimeoutErrorSym] === "StreamTimeoutError"
  )
}

/**
 * Switches the stream if it does not produce a value after the spcified
 * duration.
 *
 * @tsplus fluent ets/Stream timeoutTo
 */
export function timeoutTo_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  duration: LazyArg<Duration>,
  that: LazyArg<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A | A2> {
  return self
    .timeoutFailCause(Cause.die(new StreamTimeoutError()), duration)
    .catchSomeCause((cause) =>
      cause.isDieType() && isStreamTimeoutError(cause.value)
        ? Option.some(that())
        : Option.none
    )
}

/**
 * Switches the stream if it does not produce a value after the spcified
 * duration.
 *
 * @tsplus static ets/Stream/Aspects timeoutTo
 */
export const timeoutTo = Pipeable(timeoutTo_)
