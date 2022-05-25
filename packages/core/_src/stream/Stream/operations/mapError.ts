import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Transforms the errors emitted by this stream using `f`.
 *
 * @tsplus fluent ets/Stream mapError
 */
export function mapError_<R, E, E2, A>(
  self: Stream<R, E, A>,
  f: (e: E) => E2,
  __tsplusTrace?: string
): Stream<R, E2, A> {
  concreteStream(self)
  return new StreamInternal(self.channel.mapError(f))
}

/**
 * Transforms the errors emitted by this stream using `f`.
 *
 * @tsplus static ets/Stream/Aspects mapError
 */
export const mapError = Pipeable(mapError_)
