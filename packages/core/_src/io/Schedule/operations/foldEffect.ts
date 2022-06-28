import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 *
 * @tsplus static effect/core/io/Schedule.Aspects foldEffect
 * @tsplus pipeable effect/core/io/Schedule foldEffect
 */
export function foldEffect<Out, Env1, Z>(
  z: Z,
  f: (z: Z, out: Out) => Effect<Env1, never, Z>
) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<Tuple<[State, Z]>, Env | Env1, In, Z> =>
    makeWithState(Tuple(self._initial, z), (now, input, { tuple: [s, z] }) =>
      self
        ._step(now, input, s)
        .flatMap(({ tuple: [s, out, decision] }): Effect<Env | Env1, never, Tuple<[Tuple<[State, Z]>, Z, Decision]>> =>
          decision._tag === "Done"
            ? Effect.succeed(Tuple(Tuple(s, z), z, decision))
            : f(z, out).map((z2) => Tuple(Tuple(s, z2), z, decision))
        ))
}
