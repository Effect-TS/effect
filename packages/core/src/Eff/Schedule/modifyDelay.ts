import { Clock, ClockURI } from "../Clock"
import { provideAll_ } from "../Effect"
import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
import { provideSome_ } from "../Effect/provideSome"

import { Schedule } from "./schedule"

/**
 * Returns a new schedule with the specified effectful modification
 * applied to each sleep performed by this schedule.
 *
 * Note that this does not apply to sleeps performed in Schedule#initial.
 * All effects executed while calculating the modified duration will run with the old
 * environment.
 */
export const modifyDelay_ = <S, R, ST, A, B, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  f: (b: B, ms: number) => Effect<S2, R2, never, number>
): Schedule<S, R & R2 & Clock, ST, A, B> =>
  new Schedule(
    self.initial,
    (a, s) =>
      provideSome_(self.update(a, s), (r: R & R2 & Clock): R & Clock => ({
        ...r,
        [ClockURI]: {
          ...r[ClockURI],
          sleep: (ms) =>
            chain_(provideAll_(f(self.extract(a, s), ms), r), (ms) =>
              r[ClockURI].sleep(ms)
            )
        }
      })),
    self.extract
  )

/**
 * Returns a new schedule with the specified effectful modification
 * applied to each sleep performed by this schedule.
 *
 * Note that this does not apply to sleeps performed in Schedule#initial.
 * All effects executed while calculating the modified duration will run with the old
 * environment.
 */
export const modifyDelay = <B, S2, R2>(
  f: (b: B, ms: number) => Effect<S2, R2, never, number>
) => <S, R, ST, A>(
  self: Schedule<S, R, ST, A, B>
): Schedule<S, R & R2 & Clock, ST, A, B> => modifyDelay_(self, f)
