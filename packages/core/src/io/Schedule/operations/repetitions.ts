/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 *
 * @tsplus getter effect/core/io/Schedule repetitions
 * @category mutations
 * @since 1.0.0
 */
export function repetitions<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Schedule<readonly [State, number], Env, In, number> {
  return self.fold(0, (n, _) => n + 1)
}
