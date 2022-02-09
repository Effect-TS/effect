import { Effect } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that passes each input and output of this schedule
 * to the specified function, and then determines whether or not to continue
 * based on the return value of the function.
 *
 * @tsplus fluent ets/Schedule check
 * @tsplus fluent ets/ScheduleWithState check
 */
export function check_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  test: (input: In, output: Out) => boolean
): Schedule.WithState<State, Env, In, Out> {
  return self.checkEffect((in1: In, out) => Effect.succeed(test(in1, out)))
}

/**
 * Returns a new schedule that passes each input and output of this schedule
 * to the specified function, and then determines whether or not to continue
 * based on the return value of the function.
 *
 * @ets_data_first check_
 */
export function check<In, Out>(test: (input: In, output: Out) => boolean) {
  return <State, Env>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out> => self.check(test)
}
