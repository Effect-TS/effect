import { Effect } from "../Effect/effect"
import { repeatOrElse_ } from "../Effect/repeat"

import { Schedule } from "./schedule"

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 */
export const repeat = <S, R, E, A>(self: Effect<S, R, E, A>) => <SS, SR, SST, B>(
  schedule: Schedule<SS, SR, SST, A, B>
): Effect<S | SS, R & SR, E, B> => repeatOrElse_(self, schedule, (e) => fail(e))

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 */
export const repeat_ = <SS, SR, SST, B, S, R, E, A>(
  schedule: Schedule<SS, SR, SST, A, B>,
  self: Effect<S, R, E, A>
): Effect<S | SS, R & SR, E, B> => repeatOrElse_(self, schedule, (e) => fail(e))
