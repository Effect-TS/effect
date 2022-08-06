import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a stream from a `Chunk` of values.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunk
 */
export function fromChunk<A>(
  chunk: LazyArg<Chunk<A>>
): Stream<never, never, A> {
  return new StreamInternal(
    Channel.sync(chunk).flatMap((chunk) => chunk.isEmpty ? Channel.unit : Channel.write(chunk))
  )
}
