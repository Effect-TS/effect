import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Repeats this stream forever.
 *
 * @tsplus getter effect/core/stream/Stream forever
 * @category mutations
 * @since 1.0.0
 */
export function forever<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, A> {
  concreteStream(self)
  return new StreamInternal(self.channel.repeated)
}
