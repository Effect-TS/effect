import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * The empty stream.
 *
 * @tsplus static ets/Stream/Ops empty
 */
export const empty: Stream<never, never, never> = new StreamInternal(
  Channel.write(Chunk.empty())
)
