/**
 * Returns a new schedule that contramaps the input and maps the output.
 *
 * @tsplus static effect/core/io/Schedule.Aspects dimap
 * @tsplus pipeable effect/core/io/Schedule dimap
 */
export function dimap<In, Out, In2, Out2>(
  f: (in2: In2) => In,
  g: (out: Out) => Out2
) {
  return <State, Env>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env, In2, Out2> => self.contramap(f).map(g)
}
