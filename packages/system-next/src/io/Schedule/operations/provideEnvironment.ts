import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule with its environment provided to it, so the
 * resulting schedule does not require any environment.
 *
 * @tsplus fluent ets/Schedule provideEnvironment
 * @tsplus fluent ets/ScheduleWithState provideEnvironment
 */
export function provideEnvironment_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  environment: Env
): Schedule.WithState<State, unknown, In, Out> {
  return makeWithState(self._initial, (now, input, state) =>
    self._step(now, input, state).provideEnvironment(environment)
  )
}

/**
 * Returns a new schedule with its environment provided to it, so the
 * resulting schedule does not require any environment.
 *
 * @ets_data_first provideEnvironment_
 */
export function provideEnvironment<Env>(environment: Env) {
  return <State, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, unknown, In, Out> => self.provideEnvironment(environment)
}
