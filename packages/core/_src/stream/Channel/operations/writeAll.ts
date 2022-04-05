/**
 * @tsplus static ets/Channel/Ops writeAll
 */
export function writeAll<Out>(
  ...outs: Array<Out>
): Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return Channel.writeChunk(Chunk.from(outs));
}
