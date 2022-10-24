/**
 * Returns a new schedule that contramaps the input and maps the output.
 *
 * @tsplus static effect/core/io/Schedule.Aspects dimapEffect
 * @tsplus pipeable effect/core/io/Schedule dimapEffect
 * @category mapping
 * @since 1.0.0
 */
export function dimapEffect<In, Out, Env1, Env2, In2, Out2>(
  f: (in2: In2) => Effect<Env1, never, In>,
  g: (out: Out) => Effect<Env2, never, Out2>
) {
  return <State, Env>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1 | Env2, In2, Out2> => self.contramapEffect(f).mapEffect(g)
}
