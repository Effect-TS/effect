import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @tsplus pipeable-operator effect/core/stream/Stream |
 * @tsplus static effect/core/stream/Stream.Aspects orElse
 * @tsplus pipeable effect/core/stream/Stream orElse
 */
export function orElse<R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E2, A | A2> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel.orElse(() => {
        const that0 = that()
        concreteStream(that0)
        return that0.channel
      })
    )
  }
}
