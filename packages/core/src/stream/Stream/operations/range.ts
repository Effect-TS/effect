import { DEFAULT_CHUNK_SIZE } from "@effect/core/stream/Stream/definition"
import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Constructs a stream from a range of integers (lower bound included, upper
 * bound not included).
 *
 * @tsplus static effect/core/stream/Stream.Ops range
 */
export function range(
  min: number,
  max: number,
  chunkSize = DEFAULT_CHUNK_SIZE
): Stream<never, never, number> {
  return Stream.suspend(new StreamInternal(go(min, max, chunkSize)))
}

function go(
  min: number,
  max: number,
  chunkSize: number
): Channel<never, unknown, unknown, unknown, never, Chunk<number>, unknown> {
  const remaining = max - min
  return remaining > chunkSize
    ? Channel.write(Chunk.range(min, min + chunkSize - 1)).flatMap(() =>
      go(min + chunkSize, max, chunkSize)
    )
    : Channel.write(Chunk.range(min, min + remaining - 1))
}
