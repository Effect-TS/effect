import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState";

/**
 * Returns a new schedule with the single service it requires provided to it.
 * If the schedule requires multiple services use `provideEnvironment`
 * instead.
 *
 * @tsplus fluent ets/Schedule provideService
 * @tsplus fluent ets/Schedule/WithState provideService
 */
export function provideService_<State, Env, In, Out, T>(
  self: Schedule.WithState<State, Env & Has<T>, In, Out>,
  service: Service<T>
) {
  return (
    resource: LazyArg<T>
  ): Schedule.WithState<State, Erase<Env, Has<T>>, In, Out> =>
    makeWithState(self._initial, (now, input, state) =>
      Effect.environmentWithEffect((r: Env) =>
        self
          ._step(now, input, state)
          .provideEnvironment({ ...r, ...service(resource()) })
      ));
}

/**
 * Returns a new schedule with the single service it requires provided to it.
 * If the schedule requires multiple services use `provideEnvironment`
 * instead.
 *
 * @tsplus static ets/Schedule/Aspects provideService
 */
export const provideService = Pipeable(provideService_);
