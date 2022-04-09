/**
 * Repeats the value using the provided schedule.
 *
 * @tsplus static ets/Stream/Ops repeatWithSchedule
 */
export function repeatWithSchedule<S, R, A>(
  a: LazyArg<A>,
  schedule: LazyArg<Schedule.WithState<S, R, A, unknown>>,
  __tsplusTrace?: string
): Stream<R & HasClock, never, A>;
export function repeatWithSchedule<R, A>(
  a: LazyArg<A>,
  schedule: LazyArg<Schedule<R, A, unknown>>,
  __tsplusTrace?: string
): Stream<R & HasClock, never, A> {
  return Stream.repeatEffectWithSchedule(Effect.succeed(a), schedule);
}
