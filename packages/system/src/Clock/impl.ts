import { effectTotal, unit } from "../Effect/core"
import { effectAsyncInterrupt } from "../Effect/effectAsyncInterrupt"
import { literal } from "../Function"
import { sync } from "../Sync/core"
import type { Clock } from "./definition"

//
// Live Clock Implementation
//
export const LiveClock: Clock = {
  _tag: literal("@effect-ts/system/Clock"),
  currentTime: sync(() => new Date().getTime()),
  sleep: (ms) =>
    effectAsyncInterrupt((cb) => {
      const timeout = setTimeout(() => {
        cb(unit)
      }, ms)

      return effectTotal(() => {
        clearTimeout(timeout)
      })
    })
}
