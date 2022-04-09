import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Emits the provided chunk before emitting any other value.
 *
 * @tsplus fluent ets/Stream prepend
 */
export function prepend_<R, E, A, A2>(
  stream: Stream<R, E, A>,
  values: LazyArg<Chunk<A2>>,
  __tsplusTrace?: string
): Stream<R, E, A | A2> {
  concreteStream(stream);
  return new StreamInternal(Channel.write(values) > stream.channel);
}

/**
 * Emits the provided chunk before emitting any other value.
 *
 * @tsplus static ets/Stream/Aspects prepend
 */
export const prepend = Pipeable(prepend_);
