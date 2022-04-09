import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails. Allows recovery from all causes of failure, including
 * interruption if the stream is uninterruptible.
 *
 * @tsplus fluent ets/Stream catchAllCause
 */
export function catchAllCause_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  f: (cause: Cause<E>) => Stream<R2, E2, A2>,
  __tsplusTrace?: string
): Stream<R & R2, E2, A | A2> {
  concreteStream(self);
  return new StreamInternal(
    self.channel.catchAllCause((cause) => {
      const stream = f(cause);
      concreteStream(stream);
      return stream.channel;
    })
  );
}

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails. Allows recovery from all causes of failure, including
 * interruption if the stream is uninterruptible.
 *
 * @tsplus static ets/Stream/Aspects catchAllCause
 */
export const catchAllCause = Pipeable(catchAllCause_);
