import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * @tsplus getter effect/core/stream/Sink exposeLeftover
 * @category mutations
 * @since 1.0.0
 */
export function exposeLeftover<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
): Sink<R, E, In, L, readonly [Z, Chunk.Chunk<L>]> {
  concreteSink(self)
  return new SinkInternal(
    self.channel.doneCollect.map(([chunks, z]) => [z, Chunk.flatten(chunks)])
  )
}
