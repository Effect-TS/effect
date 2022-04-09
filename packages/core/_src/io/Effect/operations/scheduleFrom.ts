/**
 * Runs this effect according to the specified schedule.
 *
 * See `scheduleFrom` for a variant that allows the schedule's decision to
 * depend on the result of this effect.
 *
 * @tsplus fluent ets/Effect scheduleFrom
 */
export function scheduleFrom_<R, E, A, S, R1, A1>(
  self: Effect<R, E, A>,
  a: LazyArg<A>,
  schedule: LazyArg<Schedule.WithState<S, R1, A, A1>>,
  __tsplusTrace?: string
): Effect<R & R1 & HasClock, E, A1>;
export function scheduleFrom_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  a: LazyArg<A>,
  schedule: LazyArg<Schedule<R1, A, A1>>,
  __tsplusTrace?: string
): Effect<R & R1 & HasClock, E, A1> {
  return Clock.scheduleFrom(() => self, a, schedule);
}

/**
 * Runs this effect according to the specified schedule.
 *
 * See `scheduleFrom` for a variant that allows the schedule's decision to
 * depend on the result of this effect.
 *
 * @tsplus static ets/Effect/Aspects scheduleFrom
 */
export function scheduleFrom<S, R1, A, A1>(
  a: LazyArg<A>,
  schedule: LazyArg<Schedule.WithState<S, R1, A, A1>>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R & R1 & HasClock, E, A1>;
export function scheduleFrom<R1, A, A1>(
  a: LazyArg<A>,
  schedule: LazyArg<Schedule<R1, A, A1>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1 & HasClock, E, A1> => self.scheduleFrom(a, schedule);
}
