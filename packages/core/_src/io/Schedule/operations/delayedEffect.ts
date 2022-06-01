/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @tsplus fluent ets/Schedule delayedEffect
 * @tsplus fluent ets/Schedule/WithState delayedEffect
 */
export function delayedEffect_<State, Env, In, Out, Env1>(
  self: Schedule<State, Env, In, Out>,
  f: (duration: Duration) => Effect.RIO<Env1, Duration>
): Schedule<State, Env | Env1, In, Out> {
  return self.modifyDelayEffect((_, delay) => f(delay))
}

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @tsplus static ets/Schedule/Aspects delayedEffect
 */
export const delayedEffect = Pipeable(delayedEffect_)
