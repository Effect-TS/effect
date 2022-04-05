import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Transforms the full causes of failures emitted by this stream.
 *
 * @tsplus fluent ets/Stream mapErrorCause
 */
export function mapErrorCause_<R, E, E2, A>(
  self: Stream<R, E, A>,
  f: (e: Cause<E>) => Cause<E2>,
  __tsplusTrace?: string
): Stream<R, E2, A> {
  concreteStream(self);
  return new StreamInternal(self.channel.mapErrorCause(f));
}

/**
 * Transforms the full causes of failures emitted by this stream.
 *
 * @tsplus static ets/Stream/Aspects mapErrorCause
 */
export const mapErrorCause = Pipeable(mapErrorCause_);
