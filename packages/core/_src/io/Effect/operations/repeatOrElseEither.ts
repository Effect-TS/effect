import type { Driver } from "@effect/core/io/Schedule"

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus fluent ets/Effect repeatOrElseEither
 */
export function repeatOrElseEither_<S, R, E, A, R1, B, R2, E2, C>(
  self: Effect<R, E, A>,
  schedule: LazyArg<Schedule<S, R1, A, B>>,
  orElse: (e: E, option: Option<B>) => Effect<R2, E2, C>,
  __tsplusTrace?: string
): Effect<R & R1 & R2, E2, Either<C, B>> {
  return Effect.suspendSucceed(() => {
    const schedule0 = schedule()
    return schedule0.driver().flatMap((driver) =>
      self.foldEffect(
        (e) => orElse(e, Option.none).map(Either.left),
        (a) => repeatOrElseEitherLoop(self, driver, orElse, a)
      )
    )
  })
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus static ets/Effect/Aspects repeateOrElseEither
 */
export function repeatOrElseEither<S, R1, A, B, E, R2, E2, C>(
  schedule: LazyArg<Schedule<S, R1, A, B>>,
  orElse: (e: E, option: Option<B>) => Effect<R2, E2, C>,
  __tsplusTrace?: string
): <R>(self: Effect<R, E, A>) => Effect<R & R1 & R2, E2, Either<C, B>> {
  return <R>(self: Effect<R, E, A>): Effect<R & R1 & R2, E2, Either<C, B>> => self.repeatOrElseEither(schedule, orElse)
}

function repeatOrElseEitherLoop<R, E, A, R1, B, R2, E2, C>(
  self: Effect<R, E, A>,
  driver: Driver<unknown, R1, A, B>,
  orElse: (e: E, option: Option<B>) => Effect<R2, E2, C>,
  value: A
): Effect<R & R1 & R2, E2, Either<C, B>> {
  return driver.next(value).foldEffect(
    () => driver.last.orDie().map(Either.right),
    (b) =>
      self.foldEffect(
        (e) => orElse(e, Option.some(b)).map(Either.left),
        (a) => repeatOrElseEitherLoop(self, driver, orElse, a)
      )
  )
}
