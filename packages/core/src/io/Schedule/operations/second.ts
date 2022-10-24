/**
 * Returns a new schedule that packs the input and output of this schedule
 * into the second element of a tuple. This allows carrying information
 * through this schedule.
 *
 * @tsplus getter effect/core/io/Schedule second
 * @category mutations
 * @since 1.0.0
 */
export function second<State, Env, In, Out, X>(
  self: Schedule<State, Env, In, Out>
): Schedule<readonly [void, State], Env, readonly [X, In], readonly [X, Out]> {
  return Schedule.identity<X>() ** self
}
