import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Transforms the errors emitted by this stream using `f`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapError
 * @tsplus pipeable effect/core/stream/Stream mapError
 */
export function mapError<E, E2>(f: (e: E) => E2, __tsplusTrace?: string) {
  return <R, A>(self: Stream<R, E, A>): Stream<R, E2, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel.mapError(f))
  }
}
