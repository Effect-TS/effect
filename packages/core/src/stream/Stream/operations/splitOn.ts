import * as Chunk from "@fp-ts/data/Chunk"
/**
 * Splits strings on a delimiter.
 *
 * @tsplus static effect/core/stream/Stream.Aspects splitOn
 * @tsplus pipeable effect/core/stream/Stream splitOn
 * @category mutations
 * @since 1.0.0
 */
export function splitOn(delimiter: string) {
  return <R, E>(self: Stream<R, E, string>): Stream<R, E, string> =>
    self
      .map(Chunk.fromIterable)
      .unchunks
      .splitOnChunkFlatten(Chunk.fromIterable(delimiter))
      .chunks
      .map(Chunk.join(""))
}
