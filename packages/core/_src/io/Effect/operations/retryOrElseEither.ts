import type { Driver } from "@effect/core/io/Schedule"

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryOrElseEither
 * @tsplus pipeable effect/core/io/Effect retryOrElseEither
 */
export function retryOrElseEither<S, R1, E, A1, R2, E2, A2>(
  policy: LazyArg<Schedule<S, R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>
): <R, A>(self: Effect<R, E, A>) => Effect<R | R1 | R2, E | E2, Either<A2, A>> {
  return <R, A>(
    self: Effect<R, E, A>
  ): Effect<R | R1 | R2, E | E2, Either<A2, A>> =>
    Effect.suspendSucceed(() => {
      const schedule = policy()
      return schedule.driver.flatMap((driver) => retryOrElseEitherLoop(self, driver, orElse))
    })
}

function retryOrElseEitherLoop<R, E, A, R1, A1, R2, E2, A2>(
  self: Effect<R, E, A>,
  driver: Driver<unknown, R1, E, A1>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>
): Effect<R | R1 | R2, E | E2, Either<A2, A>> {
  return self.map(Either.right).catchAll((e) =>
    driver.next(e).foldEffect(
      () => driver.last.orDie.flatMap((out) => orElse(e, out).map(Either.left)),
      () => retryOrElseEitherLoop(self, driver, orElse)
    )
  )
}
