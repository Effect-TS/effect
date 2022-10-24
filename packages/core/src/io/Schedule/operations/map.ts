/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects map
 * @tsplus pipeable effect/core/io/Schedule map
 * @category mapping
 * @since 1.0.0
 */
export function map<Out, Out2>(f: (out: Out) => Out2) {
  return <State, Env, In>(self: Schedule<State, Env, In, Out>): Schedule<State, Env, In, Out2> =>
    self.mapEffect((out) => Effect.sync(f(out)))
}
