import type { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { Sink } from "../definition"
import { concreteSink, SinkInternal } from "./_internal/SinkInternal"

/**
 * @tsplus fluent ets/Sink exposeLeftover
 */
export function exposeLeftover<R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>,
  __tsplusTrace?: string
): Sink<R, E, In, L, Tuple<[Z, Chunk<L>]>> {
  concreteSink(self)
  return new SinkInternal(
    self.channel
      .doneCollect()
      .map(({ tuple: [chunks, z] }) => Tuple(z, chunks.flatten()))
  )
}
