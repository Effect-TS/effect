import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a stream from a `Channel`.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChannel
 */
export function fromChannel<R, E, A>(
  channel: Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>
): Stream<R, E, A> {
  return new StreamInternal(channel)
}
