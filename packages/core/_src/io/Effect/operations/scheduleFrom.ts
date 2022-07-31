import type { Driver } from "@effect/core/io/Schedule"

/**
 * Runs this effect according to the specified schedule.
 *
 * See `scheduleFrom` for a variant that allows the schedule's decision to
 * depend on the result of this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects scheduleFrom
 * @tsplus pipeable effect/core/io/Effect scheduleFrom
 */
export function scheduleFrom<S, R1, A, A1>(
  a: LazyArg<A>,
  schedule: LazyArg<Schedule<S, R1, A, A1>>
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E, A1> =>
    Effect.suspendSucceed(() => {
      const schedule0 = schedule()
      const value = a()
      return schedule0.driver.flatMap(scheduleFromLoop(self, value))
    })
}

function scheduleFromLoop<R, E, A>(self: Effect<R, E, A>, value: A) {
  return <S, R1, B>(driver: Driver<S, R1, A, B>): Effect<R | R1, E, B> =>
    driver.next(value).foldEffect(
      () => driver.last.orDie,
      () => self.flatMap((a) => scheduleFromLoop(self, a)(driver))
    )
}
