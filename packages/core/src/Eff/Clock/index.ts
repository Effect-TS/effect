import { accessM } from "../Effect/accessM"
import { Sync, Async } from "../Effect/effect"
import { effectAsyncInterrupt } from "../Effect/effectAsyncInterrupt"
import { effectTotal } from "../Effect/effectTotal"
import { unit } from "../Effect/unit"

//
// Clock URI
//
export const ClockURI = "@matechs/core/Eff/ClockURI"

//
// Clock Definition
//
export interface Clock {
  [ClockURI]: {
    currentTime: Sync<number>
    sleep: (ms: number) => Async<void>
  }
}

//
// Live Clock Implementation
//
export const liveClock: Clock = {
  [ClockURI]: {
    currentTime: effectTotal(() => new Date().getTime()),
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
}

/**
 * Get the current time in ms since epoch
 */
export const currentTime =
  /*#__PURE__*/
  accessM(({ [ClockURI]: { currentTime } }: Clock) => currentTime)

/**
 * Sleeps for the provided amount of ms
 */
export const sleep = (ms: number) =>
  accessM(({ [ClockURI]: { sleep } }: Clock) => sleep(ms))
