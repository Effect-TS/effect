/**
 * The same as `intersect` but ignores the left output.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule >
 * @tsplus static effect/core/io/Schedule.Aspects zipRight
 * @tsplus pipeable effect/core/io/Schedule zipRight
 */
export function zipRight<State1, Env1, In1, Out2>(
  that: Schedule<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<readonly [State, State1], Env | Env1, In & In1, Out2> =>
    self.intersect(that).map((out) => out[1] as Out2)
}
