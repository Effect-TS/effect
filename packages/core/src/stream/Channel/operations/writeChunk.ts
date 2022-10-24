import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * @tsplus static effect/core/stream/Channel.Ops writeChunk
 * @category mutations
 * @since 1.0.0
 */
export function writeChunk<Out>(
  outs: Chunk.Chunk<Out>
): Channel<never, unknown, unknown, unknown, never, Out, void> {
  return writer(0, outs.length, outs)
}

function writer<Out>(
  idx: number,
  len: number,
  chunk: Chunk.Chunk<Out>
): Channel<never, unknown, unknown, unknown, never, Out, void> {
  return idx === len
    ? Channel.unit
    : Channel.write(pipe(chunk, Chunk.unsafeGet(idx))).flatMap(() => writer(idx + 1, len, chunk))
}
