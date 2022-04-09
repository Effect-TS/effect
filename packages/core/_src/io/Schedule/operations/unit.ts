/**
 * Returns a new schedule that maps the output of this schedule to unit.
 *
 * @tsplus fluent ets/Schedule asUnit
 * @tsplus fluent ets/Schedule/WithState asUnit
 */
export function asUnit<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>
): Schedule.WithState<State, Env, In, void> {
  return self.as(() => undefined);
}
