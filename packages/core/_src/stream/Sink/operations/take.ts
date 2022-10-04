import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * A sink that takes the specified number of values.
 *
 * @tsplus static effect/core/stream/Sink.Ops take
 */
export function take<In>(
  n: number
): Sink<never, never, In, In, Chunk<In>> {
  return Sink.foldChunks<In, Chunk<In>>(
    Chunk.empty(),
    (chunk) => chunk.length < n,
    (acc, input) => acc + input
  ).flatMap((acc) => {
    const [taken, leftover] = acc.splitAt(n)
    return new SinkInternal(Channel.write(leftover).flatMap(() => Channel.succeed(taken)))
  })
}
