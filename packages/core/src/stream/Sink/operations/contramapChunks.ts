import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Transforms this sink's input chunks. `f` must preserve chunking-invariance.
 *
 * @tsplus static effect/core/stream/Sink.Aspects contramapChunks
 * @tsplus pipeable effect/core/stream/Sink contramapChunks
 * @category mapping
 * @since 1.0.0
 */
export function contramapChunks<In, In1>(
  f: (input: Chunk<In1>) => Chunk<In>
) {
  return <R, E, L, Z>(self: Sink<R, E, In, L, Z>): Sink<R, E, In1, L, Z> => {
    const loop: Channel<
      R,
      never,
      Chunk<In1>,
      unknown,
      never,
      Chunk<In>,
      unknown
    > = Channel.readWith(
      (chunk: Chunk<In1>) => Channel.write(f(chunk)).flatMap(() => loop),
      (err) => Channel.fail(err),
      (done) => Channel.succeed(done)
    )
    concreteSink(self)
    return new SinkInternal(loop >> self.channel)
  }
}
