import type { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that folds over the outputs of this one.
 *
 * @tsplus fluent ets/Schedule fold
 * @tsplus fluent ets/ScheduleWithState fold
 */
export function fold_<State, Env, In, Out, Z>(
  self: Schedule.WithState<State, Env, In, Out>,
  z: Z,
  f: (z: Z, out: Out) => Z
): Schedule.WithState<Tuple<[State, Z]>, Env, In, Z> {
  return self.foldEffect(z, (z, out) => Effect.succeed(f(z, out)))
}

/**
 * Returns a new schedule that folds over the outputs of this one.
 *
 * @ets_data_first fold_
 */
export function fold<Z, Out>(z: Z, f: (z: Z, out: Out) => Z) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<Tuple<[State, Z]>, Env, In, Z> => self.fold(z, f)
}
