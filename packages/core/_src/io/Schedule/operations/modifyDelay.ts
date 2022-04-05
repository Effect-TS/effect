/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 *
 * @tsplus fluent ets/Schedule modifyDelay
 * @tsplus fluent ets/Schedule/WithState modifyDelay
 */
export function modifyDelay_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out, duration: Duration) => Duration
): Schedule.WithState<State, Env, In, Out> {
  return self.modifyDelayEffect((out, duration) => Effect.succeedNow(f(out, duration)));
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 *
 * @tsplus static ets/Schedule/Aspects modifyDelay
 */
export const modifyDelay = Pipeable(modifyDelay_);
