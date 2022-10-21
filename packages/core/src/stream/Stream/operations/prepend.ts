import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Emits the provided chunk before emitting any other value.
 *
 * @tsplus static effect/core/stream/Stream.Aspects prepend
 * @tsplus pipeable effect/core/stream/Stream prepend
 */
export function prepend<A2>(values: Chunk<A2>) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A | A2> => {
    concreteStream(stream)
    return new StreamInternal<R, E, A | A2>(Channel.write(values).zipRight(stream.channel))
  }
}
