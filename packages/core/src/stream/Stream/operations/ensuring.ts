import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Executes the provided finalizer after this stream's finalizers run.
 *
 * @tsplus static effect/core/stream/Stream.Aspects ensuring
 * @tsplus pipeable effect/core/stream/Stream ensuring
 * @category finalizers
 * @since 1.0.0
 */
export function ensuring<R1, Z>(finalizer: Effect<R1, never, Z>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R1, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel.ensuring(finalizer))
  }
}
