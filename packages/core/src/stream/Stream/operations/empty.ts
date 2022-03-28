import { Chunk } from "../../../collection/immutable/Chunk"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * The empty stream.
 *
 * @tsplus static ets/StreamOps empty
 */
export const empty: Stream<unknown, never, never> = new StreamInternal(
  Channel.write(Chunk.empty())
)
