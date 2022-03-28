import type { Chunk } from "../../../collection/immutable/Chunk"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps writeChunk
 */
export function writeChunk<Out>(
  outs: Chunk<Out>
): Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return writer(0, outs.size, outs)
}

function writer<Out>(
  idx: number,
  len: number,
  chunk: Chunk<Out>
): Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return idx === len
    ? Channel.unit
    : Channel.write(chunk.unsafeGet(idx)) > writer(idx + 1, len, chunk)
}
