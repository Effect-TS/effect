import { Chunk } from "../../../collection/immutable/Chunk"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps writeAll
 */
export function writeAll<Out>(
  ...outs: Array<Out>
): Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return Channel.writeChunk(Chunk.from(outs))
}
