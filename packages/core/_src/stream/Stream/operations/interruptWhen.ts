import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Interrupts the evaluation of this stream when the provided effect completes.
 * The given effect will be forked as part of this stream, and its success will
 * be discarded. This combinator will also interrupt any in-progress element
 * being pulled from upstream.
 *
 * If the effect completes with a failure before the stream completes, the
 * returned stream will emit that failure.
 *
 * @tsplus static effect/core/stream/Stream.Aspects interruptWhen
 * @tsplus pipeable effect/core/stream/Stream interruptWhen
 */
export function interruptWhen<R2, E2, Z>(effect: Effect<R2, E2, Z>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel.interruptWhen(effect))
  }
}
