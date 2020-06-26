import { Clock, ClockURI } from "../Clock"
import { chain_ } from "../Effect/chain_"
import { AsyncR } from "../Effect/effect"
import { environment } from "../Effect/environment"
import { Do } from "../Effect/instances"
import { map_ } from "../Effect/map_"
import { provideAll_ } from "../Effect/provideAll_"

import { Schedule, ScheduleClass } from "./schedule"

/**
 * Returns a new schedule with the specified effectful modification
 * applied to each delay produced by this schedule.
 */
export const delayedM_ = <S, A, B, R = unknown, R0 = unknown>(
  self: Schedule<S, R & Clock, A, B>,
  f: (ms: number) => AsyncR<R0, number>
): Schedule<S, R & R0 & Clock, A, B> => {
  return new ScheduleClass(
    Do()
      .bind("oldEnv", environment<R0 & R & Clock>())
      .letL("env", (s): R0 & R & Clock => ({
        ...s.oldEnv,
        [ClockURI]: {
          currentTime: s.oldEnv[ClockURI].currentTime,
          sleep: (ms) =>
            provideAll_(
              chain_(f(ms), (n) => s.oldEnv[ClockURI].sleep(n)),
              s.oldEnv
            )
        }
      }))
      .bindL("initial", (s) => provideAll_(self.initial, s.env))
      .return((s): [any, R0 & R & Clock] => [s.initial, s.env]),
    (a: A, s: [any, R0 & R & Clock]) =>
      map_(provideAll_(self.update(a, s[0]), s[1]), (_): [any, R0 & R & Clock] => [
        _,
        s[1]
      ]),
    (a: A, s: [any, R0 & R & Clock]) => self.extract(a, s[0])
  )
}
