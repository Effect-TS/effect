import { Chunk } from "../../../collection/immutable/Chunk"
import { Channel } from "../../Channel"
import { DEFAULT_CHUNK_SIZE, Stream } from "../definition"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Constructs a stream from a range of integers (lower bound included, upper
 * bound not included).
 *
 * @tsplus static ets/StreamOps range
 */
export function range(
  min: number,
  max: number,
  chunkSize = DEFAULT_CHUNK_SIZE,
  __tsplusTrace?: string
): Stream<unknown, never, number> {
  return Stream.suspend(new StreamInternal(go(min, max, chunkSize)))
}

function go(
  min: number,
  max: number,
  chunkSize: number
): Channel<unknown, unknown, unknown, unknown, never, Chunk<number>, unknown> {
  const remaining = max - min
  return remaining > chunkSize
    ? Channel.write(Chunk.range(min, min + chunkSize - 1)) >
        go(min + chunkSize, max, chunkSize)
    : Channel.write(Chunk.range(min, min + remaining - 1))
}
