/**
 * Return a new schedule that automatically resets the schedule to its initial
 * state after some time of inactivity defined by `duration`.
 *
 * @tsplus fluent ets/Schedule resetAfter
 * @tsplus fluent ets/Schedule/WithState resetAfter
 */
export function resetAfter_<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  duration: Duration
): Schedule<Tuple<[State, Maybe<number>]>, Env, In, Out> {
  return self
    .zip(Schedule.elapsed)
    .resetWhen(({ tuple: [, _] }) => (_ as Duration) >= duration)
    .map((out) => out.get(0) as Out)
}

/**
 * Return a new schedule that automatically resets the schedule to its initial
 * state after some time of inactivity defined by `duration`.
 *
 * @tsplus static ets/Schedule/Aspects resetAfter
 */
export const resetAfter = Pipeable(resetAfter_)
