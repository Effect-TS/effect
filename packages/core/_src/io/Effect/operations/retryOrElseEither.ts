import type { Driver } from "@effect/core/io/Schedule";

/**
 * Returns an effect that retries this effect with the specified schedule when
 * it fails, until the schedule is done, then both the value produced by the
 * schedule together with the last error are passed to the specified recovery
 * function.
 *
 * @tsplus fluent ets/Effect retryOrElseEither
 */
export function retryOrElseEither_<R, E, A, S, R1, A1, R2, E2, A2>(
  self: Effect<R, E, A>,
  policy: LazyArg<Schedule<S, R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R & R1 & R2, E | E2, Either<A2, A>> {
  return Effect.suspendSucceed(() => {
    const schedule = policy();
    return schedule.driver().flatMap((driver) => retryOrElseEitherLoop(self, driver, orElse));
  });
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @tsplus static ets/Effect/Aspects retryOrElseEither
 */
export function retryOrElseEither<S, R1, E, A1, R2, E2, A2>(
  policy: LazyArg<Schedule<S, R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): <R, A>(
  self: Effect<R, E, A>
) => Effect<R & R1 & R2, E | E2, Either<A2, A>> {
  return <R, A>(
    self: Effect<R, E, A>
  ): Effect<R & R1 & R2, E | E2, Either<A2, A>> => self.retryOrElseEither(policy, orElse);
}

function retryOrElseEitherLoop<R, E, A, R1, A1, R2, E2, A2>(
  self: Effect<R, E, A>,
  driver: Driver<unknown, R1, E, A1>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>
): Effect<R & R1 & R2, E | E2, Either<A2, A>> {
  return self.map(Either.right).catchAll((e) =>
    driver.next(e).foldEffect(
      () => driver.last.orDie().flatMap((out) => orElse(e, out).map(Either.left)),
      () => retryOrElseEitherLoop(self, driver, orElse)
    )
  );
}
