import * as E from "../../Either"
import * as O from "../../Option"
import * as S from "../Schedule"

import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { foldM_ } from "./foldM_"
import { map_ } from "./map_"
import { succeed } from "./succeed"

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value
 * and schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then
 * if that succeeds, executes `io` an additional time.
 */
export const repeatOrElseEither_ = <S, R, E, A, SS, SR, SST, B, S2, R2, E2, C>(
  self: Effect<S, R, E, A>,
  schedule: S.Schedule<SS, SR, SST, A, B>,
  orElse: (_: E, __: O.Option<B>) => Effect<S2, R2, E2, C>
): Effect<S | SS | S2, R & SR & R2, E2, E.Either<C, B>> => {
  const loop = (
    last: A,
    state: SST
  ): Effect<S | SS | S2, R & SR & R2, E2, E.Either<C, B>> => {
    return foldM_(
      schedule.update(last, state),
      () => succeed(E.right(schedule.extract(last, state))),
      (s) =>
        foldM_(
          self,
          (e) => map_(orElse(e, O.some(schedule.extract(last, state))), E.left),
          (a) => loop(a, s)
        )
    )
  }

  return foldM_(
    self,
    (e) => map_(orElse(e, O.none), E.left),
    (a) => chain_(schedule.initial, (sst) => loop(a, sst))
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
export const repeatOrElse_ = <S, R, E, A, SS, SR, SST, B, S2, R2, E2, C>(
  self: Effect<S, R, E, A>,
  schedule: S.Schedule<SS, SR, SST, A, B>,
  orElse: (_: E, __: O.Option<B>) => Effect<S2, R2, E2, C>
): Effect<S | SS | S2, R & SR & R2, E2, C | B> =>
  map_(repeatOrElseEither_(self, schedule, orElse), E.merge)

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 */
export const repeat_ = <S, R, E, A, SS, SR, SST, B>(
  self: Effect<S, R, E, A>,
  schedule: S.Schedule<SS, SR, SST, A, B>
): Effect<S | SS, R & SR, E, B> => repeatOrElse_(self, schedule, (e) => fail(e))

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 */
export const repeat = <A, SS, SR, SST, B>(schedule: S.Schedule<SS, SR, SST, A, B>) => <
  S,
  R,
  E
>(
  self: Effect<S, R, E, A>
): Effect<S | SS, R & SR, E, B> => repeatOrElse_(self, schedule, (e) => fail(e))
