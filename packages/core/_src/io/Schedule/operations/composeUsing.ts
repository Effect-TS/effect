/**
 * A backwards version of `compose`.
 *
 * @tsplus operator ets/Schedule <<
 * @tsplus operator ets/Schedule/WithState <<
 * @tsplus fluent ets/Schedule composeUsing
 * @tsplus fluent ets/Schedule/WithState composeUsing
 */
export function composeUsing_<State, Env, In, Out, State1, Env1, In2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In2, In>
): Schedule.WithState<Tuple<[State1, State]>, Env & Env1, In2, Out> {
  return that >> self;
}

/**
 * A backwards version of `compose`.
 *
 * @tsplus static ets/Schedule/Aspects composeUsing
 */
export const composeUsing = Pipeable(composeUsing_);
