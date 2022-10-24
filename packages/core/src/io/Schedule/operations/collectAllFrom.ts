import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Returns a new schedule that collects the outputs of this one into a chunk.
 *
 * @tsplus getter effect/core/io/Schedule collectAll
 * @category mutations
 * @since 1.0.0
 */
export function collectAllFrom<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Schedule<readonly [State, Chunk.Chunk<Out>], Env, In, Chunk.Chunk<Out>> {
  return self.fold(Chunk.empty as Chunk.Chunk<Out>, (xs, x) => pipe(xs, Chunk.append(x)))
}
