import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * The empty stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops empty
 * @category constructors
 * @since 1.0.0
 */
export const empty: Stream<never, never, never> = new StreamInternal(
  Channel.write(Chunk.empty)
)
