import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Creates a stream from a `Chunk` of values.
 *
 * @tsplus static ets/StreamOps fromChunk
 */
export function fromChunk<A>(
  chunk: LazyArg<Chunk<A>>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return new StreamInternal(
    Channel.succeed(chunk).flatMap((chunk) =>
      chunk.isEmpty() ? Channel.unit : Channel.write(chunk)
    )
  )
}
