/**
 * Returns a new schedule with the given effectfully computed delay added to
 * every interval defined by this schedule.
 *
 * @tsplus fluent ets/Schedule addDelayEffect
 * @tsplus fluent ets/Schedule/WithState addDelayEffect
 */
export function addDelayEffect_<State, Env, In, Out, Env1>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out) => RIO<Env1, Duration>
): Schedule.WithState<State, Env & Env1, In, Out> {
  return self.modifyDelayEffect((out, duration) => f(out).map((_) => duration + _));
}

/**
 * Returns a new schedule with the given effectfully computed delay added to
 * every interval defined by this schedule.
 *
 * @tsplus static ets/Schedule/Aspects addDelayEffect
 */
export const addDelayEffect = Pipeable(addDelayEffect_);
