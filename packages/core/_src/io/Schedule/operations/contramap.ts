/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @tsplus fluent ets/Schedule contramap
 * @tsplus fluent ets/Schedule/WithState contramap
 */
export function contramap_<State, Env, In, Out, In2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (in2: In2) => In
): Schedule.WithState<State, Env, In2, Out> {
  return self.contramapEffect((input2) => Effect.succeed(f(input2)));
}

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @tsplus static ets/Schedule/Aspects contramap
 */
export const contramap = Pipeable(contramap_);
