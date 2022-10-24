import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Returns a lazily constructed stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops suspend
 * @category constructors
 * @since 1.0.0
 */
export function suspend<R, E, A>(
  stream: LazyArg<Stream<R, E, A>>
): Stream<R, E, A> {
  return new StreamInternal(
    Channel.suspend(() => {
      const stream0 = stream()
      concreteStream(stream0)
      return stream0.channel
    })
  )
}
