import { currentTime, HasClock } from "../Clock"
import { chain_ } from "../Effect/chain_"
import { map_ } from "../Effect/map_"
import { sleep } from "../Effect/sleep"

import { forever } from "./forever"
import { Schedule } from "./schedule"

/**
 * A schedule that recurs on a fixed interval. Returns the number of
 * repetitions of the schedule so far.
 *
 * If the action run between updates takes longer than the interval, then the
 * action will be run immediately, but re-runs will not "pile up".
 *
 * <pre>
 * |---------interval---------|---------interval---------|
 * |action|                   |action|
 * </pre>
 */
export function fixed(
  ms: number
): Schedule<unknown, HasClock, [number, number, number], unknown, number> {
  if (ms === 0) {
    return new Schedule(
      map_(forever.initial, (s) => [s, 0, 0]),
      (a, s) => map_(forever.update(a, s[0]), (s) => [s, 0, 0]),
      (a, s) => forever.extract(a, s[0])
    )
  }
  return new Schedule<unknown, HasClock, [number, number, number], unknown, number>(
    map_(currentTime, (t) => [t, 1, 0]),
    (_, [start, t0, i]) =>
      chain_(currentTime, (now) => {
        const wait = start + t0 * ms - now
        const n = 1 + Math.floor(wait < 0 ? (now - start) / ms : t0)

        return map_(sleep(Math.max(n, 0)), () => [start, n, i + 1])
      }),
    (_, s) => s[2]
  )
}
