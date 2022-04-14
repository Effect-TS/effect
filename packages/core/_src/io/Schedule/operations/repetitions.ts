/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 *
 * @tsplus fluent ets/Schedule repetitions
 * @tsplus fluent ets/Schedule/WithState repetitions
 */
export function repetitions<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Schedule<Tuple<[State, number]>, Env, In, number> {
  return self.fold(0, (n, _) => n + 1);
}
