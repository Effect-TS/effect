import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * @tsplus static effect/core/stream/Sink.Ops collectAll
 * @category constructors
 * @since 1.0.0
 */
export function collectAll<In>(): Sink<never, never, In, never, Chunk.Chunk<In>> {
  return new SinkInternal(loop(Chunk.empty as Chunk.Chunk<In>))
}

function loop<In>(
  acc: Chunk.Chunk<In>
): Channel<never, never, Chunk.Chunk<In>, unknown, never, never, Chunk.Chunk<In>> {
  return Channel.readWithCause(
    (chunk: Chunk.Chunk<In>) => loop<In>(pipe(acc, Chunk.concat(chunk))),
    (cause) => Channel.failCause(cause),
    () => Channel.succeed(acc)
  )
}
