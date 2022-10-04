import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * @tsplus getter effect/core/stream/Sink exposeLeftover
 */
export function exposeLeftover<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
): Sink<R, E, In, L, readonly [Z, Chunk<L>]> {
  concreteSink(self)
  return new SinkInternal(
    self.channel
      .doneCollect
      .map(([chunks, z]) => [z, chunks.flatten])
  )
}
