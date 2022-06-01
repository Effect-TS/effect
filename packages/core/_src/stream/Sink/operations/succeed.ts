import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * A sink that immediately ends with the specified value.
 *
 * @tsplus static ets/Sink/Ops succeed
 */
export function succeed<Z>(
  z: LazyArg<Z>,
  __tsplusTrace?: string
): Sink<never, never, unknown, never, Z> {
  return new SinkInternal(Channel.succeed(z))
}
