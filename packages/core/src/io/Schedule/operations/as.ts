/**
 * Returns a new schedule that maps this schedule to a constant output.
 *
 * @tsplus static effect/core/io/Schedule.Aspects as
 * @tsplus pipeable effect/core/io/Schedule as
 * @category mapping
 * @since 1.0.0
 */
export function as<Out2>(out2: Out2) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env, In, Out2> => self.map(() => out2)
}
