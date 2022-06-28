/**
 * @tsplus static effect/core/stream/Channel.Ops writeAll
 */
export function writeAll<Out>(
  ...outs: Array<Out>
): Channel<never, unknown, unknown, unknown, never, Out, void> {
  return Channel.writeChunk(Chunk.from(outs))
}
