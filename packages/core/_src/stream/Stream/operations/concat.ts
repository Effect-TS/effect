import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the
 * specified stream.
 *
 * @tsplus pipeable-operator effect/core/stream/Stream +
 * @tsplus static effect/core/stream/Stream.Aspects concat
 * @tsplus pipeable effect/core/stream/Stream concat
 */
export function concat<R1, E1, A1>(
  that: LazyArg<Stream<R1, E1, A1>>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R1, E | E1, A | A1> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel.zipRight(() => {
        const that0 = that()
        concreteStream(that0)
        return that0.channel
      })
    )
  }
}
