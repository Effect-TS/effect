import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * @tsplus static effect/core/stream/Sink.Ops dropWhile
 * @category constructors
 * @since 1.0.0
 */
export function dropWhile<In>(p: Predicate<In>): Sink<never, never, In, In, unknown> {
  const loop: Channel<
    never,
    never,
    Chunk.Chunk<In>,
    unknown,
    never,
    Chunk.Chunk<In>,
    unknown
  > = Channel.readWith(
    (chunk: Chunk.Chunk<In>) => {
      const leftover = pipe(chunk, Chunk.dropWhile(p))
      const more = Chunk.isEmpty(leftover)
      return more
        ? loop
        : Channel.write(leftover).flatMap(() => Channel.identity<never, Chunk.Chunk<In>, unknown>())
    },
    (err) => Channel.fail(err),
    () => Channel.unit
  )
  return new SinkInternal(loop)
}
