import { pipe } from "../../Function"
import { HasClock, ProxyClock } from "../Clock"
import { replaceServiceIn_ } from "../Has"

import * as T from "./effect"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule with the specified effectful modification
 * applied to each delay produced by this schedule.
 */
export const delayedM_ = <S, A, B, ST, R = unknown, R0 = unknown>(
  self: Schedule<S, R & HasClock, ST, A, B>,
  f: (ms: number) => T.AsyncR<R0, number>
): Schedule<S, R & R0 & HasClock, [ST, R0 & R & HasClock], A, B> => {
  return new Schedule(
    pipe(
      T.of,
      T.bind("oldEnv", () => T.environment<R0 & R & HasClock>()),
      T.let("env", (s): R0 & R & HasClock =>
        replaceServiceIn_(
          s.oldEnv,
          HasClock,
          (c) =>
            new ProxyClock(c.currentTime, (ms) =>
              T.provideAll_(
                T.chain_(f(ms), (n) => c.sleep(n)),
                s.oldEnv
              )
            )
        )
      ),
      T.bind("initial", (s) => T.provideAll_(self.initial, s.env)),
      T.map((s): [ST, R0 & R & HasClock] => [s.initial, s.env])
    ),
    (a: A, s: [ST, R0 & R & HasClock]) =>
      T.map_(T.provideAll_(self.update(a, s[0]), s[1]), (_): [
        ST,
        R0 & R & HasClock
      ] => [_, s[1]]),
    (a: A, s: [ST, R0 & R & HasClock]) => self.extract(a, s[0])
  )
}
