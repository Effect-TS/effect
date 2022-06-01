import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Interrupts the evaluation of this stream when the provided deferred
 * resolves. This combinator will also interrupt any in-progress element being
 * pulled from upstream.
 *
 * If the deferred completes with a failure, the stream will emit that failure.
 *
 * @tsplus fluent ets/Stream interruptWhenDeferred
 */
export function interruptWhenDeferred_<R, E, A, E2, Z>(
  self: Stream<R, E, A>,
  promise: LazyArg<Deferred<E2, Z>>,
  __tsplusTrace?: string
): Stream<R, E | E2, A> {
  concreteStream(self)
  return new StreamInternal(self.channel.interruptWhenDeferred(promise))
}

/**
 * Interrupts the evaluation of this stream when the provided deferred
 * resolves. This combinator will also interrupt any in-progress element being
 * pulled from upstream.
 *
 * If the deferred completes with a failure, the stream will emit that failure.
 *
 * @tsplus static ets/Stream/Aspects interruptWhenDeferred
 */
export const interruptWhenDeferred = Pipeable(interruptWhenDeferred_)
