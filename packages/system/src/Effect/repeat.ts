import type { HasClock } from "../Clock"
import * as E from "../Either"
import { pipe } from "../Function"
import * as O from "../Option"
import * as S from "../Schedule"
import { chain } from "./core"
import type { Effect } from "./effect"
import { foldM } from "./foldM"
import { map, map_ } from "./map"
import { orDie } from "./orDie"

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 */
export function repeatOrElseEither_<R, E, Env1, A, B, R2, E2, C>(
  self: Effect<R, E, A>,
  schedule: S.Schedule<Env1, A, B>,
  orElse: (_: E, __: O.Option<B>) => Effect<R2, E2, C>
): Effect<R & Env1 & R2 & HasClock, E2, E.Either<C, B>> {
  return pipe(
    S.driver(schedule),
    chain((driver) => {
      function loop(a: A): Effect<Env1 & HasClock & R & R2, E2, E.Either<C, B>> {
        return pipe(
          driver.next(a),
          foldM(
            () => pipe(orDie(driver.last), map(E.right)),
            (b) =>
              pipe(
                self,
                foldM(
                  (e) => pipe(orElse(e, O.some(b)), map(E.left)),
                  (a) => loop(a)
                )
              )
          )
        )
      }

      return pipe(
        self,
        foldM(
          (e) => pipe(orElse(e, O.none), map(E.left)),
          (a) => loop(a)
        )
      )
    })
  )
}

export function repeatOrElseEither<R, E, Env1, A, B, R2, E2, C>(
  schedule: S.Schedule<Env1, A, B>,
  orElse: (_: E, __: O.Option<B>) => Effect<R2, E2, C>
): (self: Effect<R, E, A>) => Effect<R & Env1 & R2 & HasClock, E2, E.Either<C, B>> {
  return (self) => repeatOrElseEither_(self, schedule, orElse)
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 */
export function repeatOrElse_<R, E, A, SR, B, R2, E2, C>(
  self: Effect<R, E, A>,
  schedule: S.Schedule<SR, A, B>,
  orElse: (_: E, __: O.Option<B>) => Effect<R2, E2, C>
): Effect<R & SR & R2 & HasClock, E2, C | B> {
  return map_(repeatOrElseEither_(self, schedule, orElse), E.merge)
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 */
export function repeatOrElse<E, A, SR, B, R2, E2, C>(
  schedule: S.Schedule<SR, A, B>,
  orElse: (_: E, __: O.Option<B>) => Effect<R2, E2, C>
): <R>(self: Effect<R, E, A>) => Effect<R & SR & R2 & HasClock, E2, C | B> {
  return (self) => repeatOrElse_(self, schedule, orElse)
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 */
export function repeat_<R, E, A, SR, B>(
  self: Effect<R, E, A>,
  schedule: S.Schedule<SR, A, B>
): Effect<R & SR & HasClock, E, B> {
  return repeatOrElse_(self, schedule, (e) => fail(e))
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 */
export function repeat<A, SR, B>(schedule: S.Schedule<SR, A, B>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & SR & HasClock, E, B> =>
    repeatOrElse_(self, schedule, (e) => fail(e))
}
