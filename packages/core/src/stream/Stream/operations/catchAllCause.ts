import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails. Allows recovery from all causes of failure, including
 * interruption if the stream is uninterruptible.
 *
 * @tsplus static effect/core/stream/Stream.Aspects catchAllCause
 * @tsplus pipeable effect/core/stream/Stream catchAllCause
 * @category alternatives
 * @since 1.0.0
 */
export function catchAllCause<E, R2, E2, A2>(
  f: (cause: Cause<E>) => Stream<R2, E2, A2>
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R | R2, E2, A | A2> => {
    concreteStream(self)
    return new StreamInternal<R | R2, E2, A | A2>(
      self.channel.catchAllCause((cause) => {
        const stream = f(cause)
        concreteStream(stream)
        return stream.channel
      })
    )
  }
}
