import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static effect/core/io/Effect.Aspects replicate
 * @tsplus pipeable effect/core/io/Effect replicate
 * @category replicating
 * @since 1.0.0
 */
export function replicate(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Chunk.Chunk<Effect<R, E, A>> => {
    return pipe(
      Chunk.range(0, n - 1),
      Chunk.map(() => self)
    )
  }
}
