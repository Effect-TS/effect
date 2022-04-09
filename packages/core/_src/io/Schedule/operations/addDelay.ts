/**
 * Returns a new schedule with the given delay added to every interval defined
 * by this schedule.
 *
 * @tsplus fluent ets/Schedule addDelay
 * @tsplus fluent ets/Schedule/WithState addDelay
 */
export function addDelay_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out) => Duration
): Schedule.WithState<State, Env, In, Out> {
  return self.addDelayEffect((out) => Effect.succeed(f(out)));
}

/**
 * Returns a new schedule with the given delay added to every interval defined
 * by this schedule.
 *
 * @tsplus static ets/Schedule/Aspects addDelay
 */
export const addDelay = Pipeable(addDelay_);
