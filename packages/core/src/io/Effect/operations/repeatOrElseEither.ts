import type { Driver } from "@effect/core/io/Schedule"
import * as Either from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatOrElseEither
 * @tsplus pipeable effect/core/io/Effect repeatOrElseEither
 * @category repetititon
 * @since 1.0.0
 */
export function repeatOrElseEither<S, R1, A, B, E, R2, E2, C>(
  schedule: Schedule<S, R1, A, B>,
  orElse: (e: E, option: Option.Option<B>) => Effect<R2, E2, C>
): <R>(self: Effect<R, E, A>) => Effect<R | R1 | R2, E2, Either.Either<C, B>> {
  return <R>(self: Effect<R, E, A>): Effect<R | R1 | R2, E2, Either.Either<C, B>> =>
    schedule.driver.flatMap((driver) =>
      self.foldEffect(
        (e) => orElse(e, Option.none).map(Either.left),
        (a) => repeatOrElseEitherLoop(self, driver, orElse, a)
      )
    )
}

function repeatOrElseEitherLoop<R, E, A, R1, B, R2, E2, C>(
  self: Effect<R, E, A>,
  driver: Driver<unknown, R1, A, B>,
  orElse: (e: E, option: Option.Option<B>) => Effect<R2, E2, C>,
  value: A
): Effect<R | R1 | R2, E2, Either.Either<C, B>> {
  return driver.next(value).foldEffect(
    () => driver.last.orDie.map(Either.right),
    (b) =>
      self.foldEffect(
        (e) => orElse(e, Option.some(b)).map(Either.left),
        (a) => repeatOrElseEitherLoop(self, driver, orElse, a)
      )
  )
}
