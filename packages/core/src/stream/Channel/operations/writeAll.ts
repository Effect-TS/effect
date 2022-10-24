import * as Chunk from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/stream/Channel.Ops writeAll
 * @category mutations
 * @since 1.0.0
 */
export function writeAll<Out>(
  ...outs: Array<Out>
): Channel<never, unknown, unknown, unknown, never, Out, void> {
  return Channel.writeChunk(Chunk.fromIterable(outs))
}
