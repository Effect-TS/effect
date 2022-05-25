/**
 * Returns a new schedule that contramaps the input and maps the output.
 *
 * @tsplus fluent ets/Schedule dimap
 * @tsplus fluent ets/Schedule/WithState dimap
 */
export function dimap_<State, Env, In, Out, In2, Out2>(
  self: Schedule<State, Env, In, Out>,
  f: (in2: In2) => In,
  g: (out: Out) => Out2
): Schedule<State, Env, In2, Out2> {
  return self.contramap(f).map(g)
}

/**
 * Returns a new schedule that contramaps the input and maps the output.
 *
 * @tsplus static ets/Schedule/Aspects dimap
 */
export const dimap = Pipeable(dimap_)
