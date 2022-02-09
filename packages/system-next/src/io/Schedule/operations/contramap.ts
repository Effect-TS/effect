import { Effect } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @tsplus fluent ets/Schedule contramap
 * @tsplus fluent ets/ScheduleWithState contramap
 */
export function contramap_<State, Env, In, Out, In2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (in2: In2) => In
): Schedule.WithState<State, Env, In2, Out> {
  return self.contramapEffect((input2) => Effect.succeed(f(input2)))
}

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @ets_data_first contramap_
 */
export function contramap<In2, In>(f: (in2: In2) => In) {
  return <State, Env, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In2, Out> => self.contramap(f)
}
