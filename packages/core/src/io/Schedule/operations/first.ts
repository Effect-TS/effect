/**
 * Returns a new schedule that packs the input and output of this schedule
 * into the first element of a tuple. This allows carrying information through
 * this schedule.
 *
 * @tsplus getter effect/core/io/Schedule first
 * @category mutations
 * @since 1.0.0
 */
export function first<State, Env, In, Out, X>(
  self: Schedule<State, Env, In, Out>
): Schedule<readonly [State, void], Env, readonly [In, X], readonly [Out, X]> {
  return self ** Schedule.identity<X>()
}
