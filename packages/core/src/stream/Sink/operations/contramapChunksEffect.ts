import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Effectfully transforms this sink's input chunks. `f` must preserve
 * chunking-invariance.
 *
 * @tsplus static effect/core/stream/Sink.Aspects contramapChunksEffect
 * @tsplus pipeable effect/core/stream/Sink contramapChunksEffect
 * @category mapping
 * @since 1.0.0
 */
export function contramapChunksEffect<In0, R2, E2, In2>(
  f: (input: Chunk<In0>) => Effect<R2, E2, Chunk<In2>>
) {
  return <R, E, L, Z>(self: Sink<R, E, In2, L, Z>): Sink<R | R2, E | E2, In0, L, Z> => {
    const loop: Channel<
      R | R2,
      never,
      Chunk<In0>,
      unknown,
      E | E2,
      Chunk<In2>,
      unknown
    > = Channel.readWith(
      (chunk: Chunk<In0>) =>
        Channel.fromEffect(f(chunk)).flatMap((chunk) => Channel.write(chunk)).flatMap(() => loop),
      (err) => Channel.fail(err),
      (done) => Channel.succeed(done)
    )
    concreteSink(self)
    return new SinkInternal(loop.pipeToOrFail(self.channel))
  }
}
