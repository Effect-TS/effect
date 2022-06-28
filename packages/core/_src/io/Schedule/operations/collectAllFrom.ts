/**
 * Returns a new schedule that collects the outputs of this one into a chunk.
 *
 * @tsplus getter effect/core/io/Schedule collectAll
 */
export function collectAllFrom<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Schedule<Tuple<[State, Chunk<Out>]>, Env, In, Chunk<Out>> {
  return self.fold(Chunk.empty(), (xs, x) => xs.append(x))
}
