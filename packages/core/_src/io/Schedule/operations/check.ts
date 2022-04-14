/**
 * Returns a new schedule that passes each input and output of this schedule
 * to the specified function, and then determines whether or not to continue
 * based on the return value of the function.
 *
 * @tsplus fluent ets/Schedule check
 * @tsplus fluent ets/Schedule/WithState check
 */
export function check_<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  test: (input: In, output: Out) => boolean
): Schedule<State, Env, In, Out> {
  return self.checkEffect((in1: In, out) => Effect.succeed(test(in1, out)));
}

/**
 * Returns a new schedule that passes each input and output of this schedule
 * to the specified function, and then determines whether or not to continue
 * based on the return value of the function.
 *
 * @tsplus static ets/Schedule/Aspects check
 */
export const check = Pipeable(check_);
