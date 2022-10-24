import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Creates a stream from a `Channel`.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChannel
 * @category conversions
 * @since 1.0.0
 */
export function fromChannel<R, E, A>(
  channel: Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>
): Stream<R, E, A> {
  return new StreamInternal(channel)
}
