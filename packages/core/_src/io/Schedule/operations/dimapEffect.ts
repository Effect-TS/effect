/**
 * Returns a new schedule that contramaps the input and maps the output.
 *
 * @tsplus fluent ets/Schedule dimapEffect
 * @tsplus fluent ets/Schedule/WithState dimapEffect
 */
export function dimapEffect_<State, Env, In, Out, Env1, Env2, In2, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (in2: In2) => RIO<Env1, In>,
  g: (out: Out) => RIO<Env2, Out2>
): Schedule.WithState<State, Env & Env1 & Env2, In2, Out2> {
  return self.contramapEffect(f).mapEffect(g);
}

/**
 * Returns a new schedule that contramaps the input and maps the output.
 *
 * @tsplus static ets/Schedule/Aspects dimapEffect
 */
export const dimapEffect = Pipeable(dimapEffect_);
