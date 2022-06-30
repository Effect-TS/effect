/**
 * Runs this effect according to the specified schedule.
 *
 * See `scheduleFrom` for a variant that allows the schedule's decision to
 * depend on the result of this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects schedule
 * @tsplus pipeable effect/core/io/Effect schedule
 */
export function schedule<S, R1, A1>(
  schedule: LazyArg<Schedule<S, R1, any, A1>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R1, E, A1> => self.scheduleFrom(undefined, schedule)
}
