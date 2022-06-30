/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 *
 * @tsplus getter effect/core/io/Schedule repetitions
 */
export function repetitions<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Schedule<Tuple<[State, number]>, Env, In, number> {
  return self.fold(0, (n, _) => n + 1)
}
