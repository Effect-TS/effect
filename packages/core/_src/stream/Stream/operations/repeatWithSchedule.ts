/**
 * Repeats the value using the provided schedule.
 *
 * @tsplus static effect/core/stream/Stream.Ops repeatWithSchedule
 */
export function repeatWithSchedule<S, R, A>(
  a: A,
  schedule: Schedule<S, R, A, unknown>
): Stream<R, never, A> {
  return Stream.repeatEffectWithSchedule(Effect.succeed(a), schedule)
}
