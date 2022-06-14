/**
 * Returns a new schedule that packs the input and output of this schedule
 * into the second element of a tuple. This allows carrying information
 * through this schedule.
 *
 * @tsplus getter ets/Schedule second
 * @tsplus getter ets/Schedule/WithState second
 */
export function second<State, Env, In, Out, X>(
  self: Schedule<State, Env, In, Out>
): Schedule<Tuple<[void, State]>, Env, Tuple<[X, In]>, Tuple<[X, Out]>> {
  return Schedule.identity<X>() ** self
}
