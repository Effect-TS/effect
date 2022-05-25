/**
 * Repeats the value using the provided schedule.
 *
 * @tsplus static ets/Stream/Ops repeatWithSchedule
 */
export function repeatWithSchedule<S, R, A>(
  a: LazyArg<A>,
  schedule: LazyArg<Schedule<S, R, A, unknown>>,
  __tsplusTrace?: string
): Stream<R, never, A> {
  return Stream.repeatEffectWithSchedule(Effect.succeed(a), schedule)
}
