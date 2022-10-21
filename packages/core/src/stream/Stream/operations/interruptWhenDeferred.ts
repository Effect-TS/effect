import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Interrupts the evaluation of this stream when the provided deferred
 * resolves. This combinator will also interrupt any in-progress element being
 * pulled from upstream.
 *
 * If the deferred completes with a failure, the stream will emit that failure.
 *
 * @tsplus static effect/core/stream/Stream.Aspects interruptWhenDeferred
 * @tsplus pipeable effect/core/stream/Stream interruptWhenDeferred
 */
export function interruptWhenDeferred<E2, Z>(promise: Deferred<E2, Z>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E | E2, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel.interruptWhenDeferred(promise))
  }
}
