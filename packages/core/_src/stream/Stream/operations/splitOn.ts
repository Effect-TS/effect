/**
 * Splits strings on a delimiter.
 *
 * @tsplus static effect/core/stream/Stream.Aspects splitOn
 * @tsplus pipeable effect/core/stream/Stream splitOn
 */
export function splitOn(delimiter: LazyArg<string>) {
  return <R, E>(self: Stream<R, E, string>): Stream<R, E, string> =>
    Stream.succeed(delimiter).flatMap((delimiter) =>
      self
        .map((s) => Chunk.from(s))
        .unchunks
        .splitOnChunkFlatten(Chunk.from(delimiter))
        .chunks
        .map((chunk) => chunk.join(""))
    )
}
