import type { HasClock } from "../Clock"
import * as E from "../Either"
import { pipe } from "../Function"
import * as O from "../Option"
import * as S from "../Schedule"
import { chain } from "./core"
import type { Effect } from "./effect"
import { foldM } from "./foldM"
import { map } from "./map"
import { map_ } from "./map_"
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
export const repeatOrElseEither_ = <S, R, E, S1, Env1, A, B, S2, R2, E2, C>(
  self: Effect<S, R, E, A>,
  schedule: S.Schedule<S1, Env1, A, B>,
  orElse: (_: E, __: O.Option<B>) => Effect<S2, R2, E2, C>
): Effect<S | S1 | S2, R & Env1 & R2 & HasClock, E2, E.Either<C, B>> => {
  return pipe(
    S.driver(schedule),
    chain((driver) => {
      function loop(
        a: A
      ): Effect<S | S1 | S2, Env1 & HasClock & R & R2, E2, E.Either<C, B>> {
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

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 */
export const repeatOrElse_ = <S, R, E, A, SS, SR, B, S2, R2, E2, C>(
  self: Effect<S, R, E, A>,
  schedule: S.Schedule<SS, SR, A, B>,
  orElse: (_: E, __: O.Option<B>) => Effect<S2, R2, E2, C>
): Effect<S | SS | S2, R & SR & R2 & HasClock, E2, C | B> =>
  map_(repeatOrElseEither_(self, schedule, orElse), E.merge)

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 */
export const repeat_ = <S, R, E, A, SS, SR, B>(
  self: Effect<S, R, E, A>,
  schedule: S.Schedule<SS, SR, A, B>
): Effect<S | SS, R & SR & HasClock, E, B> =>
  repeatOrElse_(self, schedule, (e) => fail(e))

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 */
export const repeat = <A, SS, SR, B>(schedule: S.Schedule<SS, SR, A, B>) => <S, R, E>(
  self: Effect<S, R, E, A>
): Effect<S | SS, R & SR & HasClock, E, B> =>
  repeatOrElse_(self, schedule, (e) => fail(e))
