import { currentTime, Clock } from "../Clock"
import { chain_ } from "../Effect/chain_"
import { map_ } from "../Effect/map_"
import { sleep } from "../Effect/sleep"

import { forever } from "./forever"
import { Schedule } from "./schedule"

export function fixed(
  ms: number
): Schedule<unknown, Clock, [number, number, number], unknown, number> {
  if (ms === 0) {
    return new Schedule(
      map_(forever.initial, (s) => [s, 0, 0]),
      (a, s) => map_(forever.update(a, s[0]), (s) => [s, 0, 0]),
      (a, s) => forever.extract(a, s[0])
    )
  }
  return new Schedule<unknown, Clock, [number, number, number], unknown, number>(
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
