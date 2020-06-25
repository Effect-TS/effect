import { Clock, ClockURI } from "../Clock"
import { provideAll_ } from "../Effect"
import { chain_ } from "../Effect/chain_"
import { AsyncR } from "../Effect/effect"
import { environment } from "../Effect/environment"
import { Do } from "../Effect/instances"
import { map_ } from "../Effect/map_"

import { Schedule } from "./schedule"

/**
 * Returns a new schedule with the specified effectful modification
 * applied to each delay produced by this schedule.
 */
export const delayedM_ = <S, ST, A, B, R = unknown, R0 = unknown>(
  self: Schedule<S, R & Clock, ST, A, B>,
  f: (ms: number) => AsyncR<R0, number>
) => {
  type State = [ST, R0 & R & Clock]

  return new Schedule(
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
      .return((s): State => [s.initial, s.env]),
    (a: A, s: State) =>
      map_(provideAll_(self.update(a, s[0]), s[1]), (_): State => [_, s[1]]),
    (a: A, s: State) => self.extract(a, s[0])
  )
}
