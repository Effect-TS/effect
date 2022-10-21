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
  ): Schedule<readonly [State, Z], Env | Env1, In, Z> =>
    makeWithState([self.initial, z] as const, (now, input, [s, z]) =>
      self
        .step(now, input, s)
        .flatMap((
          [s, out, decision]
        ): Effect<Env | Env1, never, readonly [readonly [State, Z], Z, Decision]> =>
          decision._tag === "Done"
            ? Effect.succeed([[s, z], z, decision])
            : f(z, out).map((z2) => [[s, z2], z, decision])
        ))
}
