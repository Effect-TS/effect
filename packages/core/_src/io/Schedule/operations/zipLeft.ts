/**
 * The same as `intersect` but ignores the right output.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule <
 * @tsplus static effect/core/io/Schedule.Aspects zipLeft
 * @tsplus pipeable effect/core/io/Schedule zipLeft
 */
export function zipLeft<State1, Env1, In1, Out2>(
  that: Schedule<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<readonly [State, State1], Env | Env1, In & In1, Out> =>
    self.intersect(that).map((out) => out[0] as Out)
}
