import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal";

/**
 * Creates a sink halting with a specified cause.
 *
 * @tsplus static ets/Sink/Ops failCause
 */
export function failCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): Sink<unknown, E, unknown, never, never> {
  return new SinkInternal(Channel.failCause(cause));
}
