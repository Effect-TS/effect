import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Transforms the full causes of failures emitted by this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapErrorCause
 * @tsplus pipeable effect/core/stream/Stream mapErrorCause
 * @category mapping
 * @since 1.0.0
 */
export function mapErrorCause<E, E2>(
  f: (e: Cause<E>) => Cause<E2>
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R, E2, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel.mapErrorCause(f))
  }
}
