import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 *
 * @tsplus fluent ets/Schedule foldEffect
 * @tsplus fluent ets/Schedule/WithState foldEffect
 */
export function foldEffect_<State, Env, In, Out, Env1, Z>(
  self: Schedule<State, Env, In, Out>,
  z: Z,
  f: (z: Z, out: Out) => Effect<Env1, never, Z>
): Schedule<Tuple<[State, Z]>, Env | Env1, In, Z> {
  return makeWithState(Tuple(self._initial, z), (now, input, { tuple: [s, z] }) =>
    self
      ._step(now, input, s)
      .flatMap(({ tuple: [s, out, decision] }): Effect<Env | Env1, never, Tuple<[Tuple<[State, Z]>, Z, Decision]>> =>
        decision._tag === "Done"
          ? Effect.succeed(Tuple(Tuple(s, z), z, decision))
          : f(z, out).map((z2) => Tuple(Tuple(s, z2), z, decision))
      ))
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 *
 * @tsplus static ets/Schedule/Aspects foldEffect
 */
export const foldEffect = Pipeable(foldEffect_)
