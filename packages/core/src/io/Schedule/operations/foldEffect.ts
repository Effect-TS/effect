import { Tuple } from "../../../collection/immutable/Tuple"
import type { RIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 *
 * @tsplus fluent ets/Schedule foldEffect
 * @tsplus fluent ets/ScheduleWithState foldEffect
 */
export function foldEffect_<State, Env, In, Out, Env1, Z>(
  self: Schedule.WithState<State, Env, In, Out>,
  z: Z,
  f: (z: Z, out: Out) => RIO<Env1, Z>
): Schedule.WithState<Tuple<[State, Z]>, Env & Env1, In, Z> {
  return makeWithState(Tuple(self._initial, z), (now, input, { tuple: [s, z] }) =>
    self
      ._step(now, input, s)
      .flatMap(({ tuple: [s, out, decision] }) =>
        decision._tag === "Done"
          ? Effect.succeed(Tuple(Tuple(s, z), z, decision))
          : f(z, out).map((z2) => Tuple(Tuple(s, z2), z, decision))
      )
  )
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 *
 * @ets_data_first foldEffect_
 */
export function foldEffect<Z, Env1, Out>(z: Z, f: (z: Z, out: Out) => RIO<Env1, Z>) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<Tuple<[State, Z]>, Env & Env1, In, Z> => self.foldEffect(z, f)
}
