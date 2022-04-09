import type { Driver } from "@effect/core/io/Schedule/Driver";

/**
 * Returns a driver that can be used to step the schedule, appropriately
 * handling sleeping.
 *
 * @tsplus fluent ets/Schedule driver
 * @tsplus fluent ets/Schedule/WithState driver
 */
export function driver<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>
): RIO<HasClock, Driver<State, Env, In, Out>> {
  return Clock.driver(self);
}
