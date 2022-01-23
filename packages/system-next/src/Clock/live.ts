import type { UIO } from "../Effect/definition"
import { asyncInterrupt } from "../Effect/operations/asyncInterrupt"
import { succeed } from "../Effect/operations/succeed"
import { unit } from "../Effect/operations/unit"
import { left } from "../Either"
import { Clock } from "./definition"

export class LiveClock extends Clock {
  currentTime: UIO<number> = succeed(() => new Date().getTime())

  sleep: (ms: number, __trace?: string) => UIO<void> = (ms, trace) =>
    asyncInterrupt((cb) => {
      const timeout = setTimeout(() => {
        cb(unit)
      }, ms)

      return left(
        succeed(() => {
          clearTimeout(timeout)
        })
      )
    }, trace)
}
