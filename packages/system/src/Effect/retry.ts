// tracing: off

import type { HasClock } from "../Clock"
import * as E from "../Either"
import { identity, pipe } from "../Function"
import type { Driver, Schedule } from "../Schedule"
import * as schedule from "../Schedule"
import * as catchAll from "./catchAll"
import * as core from "./core"
import type { Effect } from "./effect"
import * as fail from "./fail"
import * as foldM from "./foldM"
import * as map from "./map"
import * as orDie from "./orDie"

function loop<R, E, A, R1, O, R2, E2, A2>(
  self: Effect<R, E, A>,
  orElse: (e: E, o: O) => Effect<R2, E2, A2>,
  driver: Driver<R1 & HasClock, E, O>
): Effect<R & R1 & R2 & HasClock, E2, E.Either<A2, A>> {
  return pipe(
    self,
    map.map((a) => E.right(a)),
    catchAll.catchAll((e) =>
      pipe(
        driver.next(e),
        foldM.foldM(
          () =>
            pipe(
              driver.last,
              orDie.orDie,
              core.chain((o) =>
                pipe(
                  orElse(e, o),
                  map.map((a) => E.left(a))
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
export function retryOrElseEither_<R, E extends I, A, I, R1, O, R2, E2, A2>(
  self: Effect<R, E, A>,
  policy: Schedule<R1, I, O>,
  orElse: (e: E, o: O) => Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R1 & R2 & HasClock, E2, E.Either<A2, A>> {
  return pipe(
    policy,
    schedule.driver,
    core.chain((a) => loop(self, orElse, a), __trace)
  )
}

/**
 * Returns an effect that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 *
 * @dataFirst retryOrElseEither_
 */
export function retryOrElseEither<E extends I, I, R1, O, R2, E2, A2>(
  policy: Schedule<R1, I, O>,
  orElse: (e: E, o: O) => Effect<R2, E2, A2>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>) =>
    retryOrElseEither_(self, policy, orElse, __trace)
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse_<R, E extends I, I, A, R1, O, R2, E2, A2>(
  self: Effect<R, E, A>,
  policy: Schedule<R1, I, O>,
  orElse: (e: E, o: O) => Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R1 & R2 & HasClock, E2, A | A2> {
  return map.map_(
    retryOrElseEither_(self, policy, orElse, __trace),
    E.fold(identity, identity)
  )
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @dataFirst retryOrElse_
 */
export function retryOrElse<E extends I, I, R1, O, R2, E2, A2>(
  policy: Schedule<R1, I, O>,
  orElse: (e: E, o: O) => Effect<R2, E2, A2>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>) => retryOrElse_(self, policy, orElse, __trace)
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export function retry_<R, E extends I, I, A, R1, O>(
  self: Effect<R, E, A>,
  policy: Schedule<R1, I, O>,
  __trace?: string
): Effect<R & R1 & HasClock, E, A> {
  return retryOrElse_(self, policy, (e, _) => fail.fail(e), __trace)
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 *
 * @dataFirst retry_
 */
export function retry<R1, I, O>(policy: Schedule<R1, I, O>, __trace?: string) {
  return <E extends I, R, A>(self: Effect<R, E, A>): Effect<R & R1 & HasClock, E, A> =>
    retry_(self, policy, __trace)
}
