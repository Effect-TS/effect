import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * @tsplus getter effect/core/stream/Sink dropLeftover
 */
export function dropLeftover<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
): Sink<R, E, In, never, Z> {
  concreteSink(self)
  return new SinkInternal(self.channel.drain)
}
