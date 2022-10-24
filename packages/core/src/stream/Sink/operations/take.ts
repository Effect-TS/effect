import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * A sink that takes the specified number of values.
 *
 * @tsplus static effect/core/stream/Sink.Ops take
 * @category constructors
 * @since 1.0.0
 */
export function take<In>(
  n: number
): Sink<never, never, In, In, Chunk.Chunk<In>> {
  return Sink.foldChunks<In, Chunk.Chunk<In>>(
    Chunk.empty,
    (chunk) => chunk.length < n,
    (acc, input) => pipe(acc, Chunk.concat(input))
  ).flatMap((acc) => {
    const [taken, leftover] = pipe(acc, Chunk.splitAt(n))
    return new SinkInternal(Channel.write(leftover).flatMap(() => Channel.succeed(taken)))
  })
}
