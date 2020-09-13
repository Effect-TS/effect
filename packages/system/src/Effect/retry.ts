import type { HasClock } from "../Clock"
import * as E from "../Either"
import { identity, pipe } from "../Function"
import type { Driver, Schedule } from "../Schedule"
import { driver } from "../Schedule"
import { catchAll } from "./catchAll"
import { chain } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { foldM } from "./foldM"
import { map } from "./map"
import { map_ } from "./map_"
import { orDie } from "./orDie"

function loop<S, R, E, A, S1, R1, O, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  orElse: (e: E, o: O) => Effect<S2, R2, E2, A2>,
  driver: Driver<S1, R1 & HasClock, E, O>
): Effect<S | S1 | S2, R & R1 & R2 & HasClock, E2, E.Either<A2, A>> {
  return pipe(
    self,
    map((a) => E.right(a)),
    catchAll((e) =>
      pipe(
        driver.next(e),
        foldM(
          () =>
            pipe(
              driver.last,
              orDie,
              chain((o) =>
                pipe(
                  orElse(e, o),
                  map((a) => E.left(a))
                )
              )
            ),
          () => loop(self, orElse, driver)
        )
      )
    )
  )
}

/**
 * Returns an effect that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 */
export function retryOrElseEither_<S, R, E, A, S1, R1, O, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  policy: Schedule<S1, R1, E, O>,
  orElse: (e: E, o: O) => Effect<S2, R2, E2, A2>
): Effect<S | S1 | S2, R & R1 & R2 & HasClock, E2, E.Either<A2, A>> {
  return pipe(
    policy,
    driver,
    chain((a) => loop(self, orElse, a))
  )
}

/**
 * Returns an effect that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 */
export function retryOrElseEither<E, S1, R1, O, S2, R2, E2, A2>(
  policy: Schedule<S1, R1, E, O>,
  orElse: (e: E, o: O) => Effect<S2, R2, E2, A2>
) {
  return <S, R, A>(self: Effect<S, R, E, A>) => retryOrElseEither_(self, policy, orElse)
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse_<S, R, E, A, S1, R1, O, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  policy: Schedule<S1, R1, E, O>,
  orElse: (e: E, o: O) => Effect<S2, R2, E2, A2>
): Effect<S | S1 | S2, R & R1 & R2 & HasClock, E2, A | A2> {
  return map_(retryOrElseEither_(self, policy, orElse), E.fold(identity, identity))
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse<E, S1, R1, O, S2, R2, E2, A2>(
  policy: Schedule<S1, R1, E, O>,
  orElse: (e: E, o: O) => Effect<S2, R2, E2, A2>
) {
  return <S, R, A>(self: Effect<S, R, E, A>) => retryOrElse_(self, policy, orElse)
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export function retry_<S, R, E, A, S1, R1, O>(
  self: Effect<S, R, E, A>,
  policy: Schedule<S1, R1, E, O>
): Effect<S | S1, R & R1 & HasClock, E, A> {
  return retryOrElse_(self, policy, (e, _) => fail(e))
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export function retry<S1, R1, E, O>(policy: Schedule<S1, R1, E, O>) {
  return <S, R, A>(self: Effect<S, R, E, A>): Effect<S | S1, R & R1 & HasClock, E, A> =>
    retry_(self, policy)
}
