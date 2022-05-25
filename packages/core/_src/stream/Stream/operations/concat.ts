import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the
 * specified stream.
 *
 * @tsplus operator ets/Stream +
 * @tsplus fluent ets/Stream concat
 */
export function concat_<R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R1, E1, A1>>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A | A1> {
  concreteStream(self)
  return new StreamInternal(
    self.channel.zipRight(() => {
      const that0 = that()
      concreteStream(that0)
      return that0.channel
    })
  )
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the
 * specified stream.
 */
export const concat = Pipeable(concat_)
