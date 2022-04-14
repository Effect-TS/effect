/**
 * Splits strings on a delimiter.
 *
 * @tsplus fluent ets/Stream splitOn
 */
export function splitOn_<R, E>(
  self: Stream<R, E, string>,
  delimiter: LazyArg<string>,
  __tsplusTrace?: string
): Stream<R, E, string> {
  return Stream.succeed(delimiter).flatMap((delimiter) =>
    self
      .map((s) => Chunk.from(s))
      .unchunks()
      .splitOnChunkFlatten(Chunk.from(delimiter))
      .chunks()
      .map((chunk) => chunk.join(""))
  );
}

/**
 * Splits strings on a delimiter.
 *
 * @tsplus static ets/Stream/Aspects splitOn
 */
export const splitOn = Pipeable(splitOn_);
