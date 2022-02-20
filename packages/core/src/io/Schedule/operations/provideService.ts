import type { LazyArg } from "../../../data/Function"
import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import { Effect } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule with the single service it requires provided to it.
 * If the schedule requires multiple services use `provideEnvironment`
 * instead.
 *
 * @tsplus fluent ets/Schedule provideService
 * @tsplus fluent ets/ScheduleWithState provideService
 */
export function provideService_<State, Env, In, Out, T>(
  self: Schedule.WithState<State, Env & Has<T>, In, Out>,
  tag: Tag<T>
) {
  return (
    service: LazyArg<T>
  ): Schedule.WithState<State, Erase<Env, Has<T>>, In, Out> =>
    // @ts-expect-error
    makeWithState(self._initial, (now, input, state) =>
      Effect.environmentWithEffect((r: Env) =>
        self
          ._step(now, input, state)
          .provideEnvironment(mergeEnvironments(tag, r, service()))
      )
    )
}

/**
 * Returns a new schedule with the single service it requires provided to it.
 * If the schedule requires multiple services use `provideEnvironment`
 * instead.
 *
 * @ets_data_first provideService_
 */
export function provideService<T>(tag: Tag<T>) {
  return (service: LazyArg<T>) =>
    <State, Env, In, Out>(
      self: Schedule.WithState<State, Env, In, Out>
    ): Schedule.WithState<State, Erase<Env, Has<T>>, In, Out> =>
      self.provideService(tag)(service)
}
