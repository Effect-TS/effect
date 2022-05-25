/**
 * Returns a new schedule that packs the input and output of this schedule
 * into the first element of a tuple. This allows carrying information through
 * this schedule.
 */
export function first<State, Env, In, Out, X>(
  self: Schedule<State, Env, In, Out>
): Schedule<Tuple<[State, void]>, Env, Tuple<[In, X]>, Tuple<[Out, X]>> {
  return self ** Schedule.identity<X>()
}
