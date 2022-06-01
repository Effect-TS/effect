import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @tsplus operator ets/Stream |
 * @tsplus fluent ets/Stream orElse
 */
export function orElse_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R | R2, E2, A | A2> {
  concreteStream(self)
  return new StreamInternal(
    self.channel.orElse(() => {
      const that0 = that()
      concreteStream(that0)
      return that0.channel
    })
  )
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @tsplus static ets/Stream/Aspects orElse
 */
export const orElse = Pipeable(orElse_)
