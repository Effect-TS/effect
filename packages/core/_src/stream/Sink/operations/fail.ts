import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * A sink that always fails with the specified error.
 *
 * @tsplus static effect/core/stream/Sink.Ops fail
 */
export function fail<E>(
  e: LazyArg<E>,
  __tsplusTrace?: string
): Sink<never, E, unknown, never, never> {
  return new SinkInternal(Channel.fail(e))
}
