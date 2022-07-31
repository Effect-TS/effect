import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified effectful function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects mapEffect
 * @tsplus pipeable effect/core/io/Schedule mapEffect
 */
export function mapEffect<Out, Env1, Out2>(
  f: (out: Out) => Effect<Env1, never, Out2>
) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out2> =>
    makeWithState(self._initial, (now, input, state) =>
      self
        ._step(now, input, state)
        .flatMap(({ tuple: [state, out, decision] }) =>
          f(out).map((out2) => Tuple(state, out2, decision))
        ))
}
