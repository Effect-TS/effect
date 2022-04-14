/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified function.
 *
 * @tsplus fluent ets/Schedule map
 * @tsplus fluent ets/Schedule/WithState map
 */
export function map_<State, Env, In, Out, Out2>(
  self: Schedule<State, Env, In, Out>,
  f: (out: Out) => Out2
): Schedule<State, Env, In, Out2> {
  return self.mapEffect((out) => Effect.succeed(f(out)));
}

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified function.
 *
 * @tsplus static ets/Schedule/Aspects map
 */
export const map = Pipeable(map_);
