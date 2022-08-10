import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * A sink that immediately ends with the specified value.
 *
 * @tsplus static effect/core/stream/Sink.Ops sync
 */
export function sync<Z>(z: LazyArg<Z>): Sink<never, never, unknown, never, Z> {
  return new SinkInternal(Channel.sync(z))
}
