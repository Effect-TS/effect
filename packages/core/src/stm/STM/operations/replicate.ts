import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static effect/core/stm/STM.Ops replicate
 * @category mutations
 * @since 1.0.0
 */
export function replicate<R, E, A>(n: number, stm: STM<R, E, A>): Chunk.Chunk<STM<R, E, A>> {
  return pipe(
    Chunk.range(0, n - 1),
    Chunk.map(() => stm)
  )
}

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static effect/core/stm/STM.Aspects replicate
 * @tsplus pipeable effect/core/stm/STM replicate
 * @category mutations
 * @since 1.0.0
 */
export function replicateNow(n: number) {
  return <R, E, A>(self: STM<R, E, A>): Chunk.Chunk<STM<R, E, A>> => replicate(n, self)
}
