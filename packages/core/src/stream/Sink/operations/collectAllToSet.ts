import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * A sink that collects all of its inputs into a set.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllToSet
 * @category constructors
 * @since 1.0.0
 */
export function collectAllToSet<In>(): Sink<never, never, In, never, HashSet.HashSet<In>> {
  return Sink.foldLeftChunks(
    HashSet.empty<In>(),
    (set, chunk) =>
      pipe(
        chunk,
        Chunk.reduce(set, (set, input: In) => pipe(set, HashSet.add(input)))
      )
  )
}
