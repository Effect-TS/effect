import { Either } from "../../data/Either"
import type { UIO } from "../Effect"
import { Effect } from "../Effect"
import { Clock } from "./definition"

export class LiveClock extends Clock {
  currentTime: UIO<number> = Effect.succeed(new Date().getTime())

  sleep = (ms: number, __etsTrace?: string): UIO<void> =>
    Effect.asyncInterrupt((cb) => {
      const timeout = setTimeout(() => {
        cb(Effect.unit)
      }, ms)

      return Either.left(
        Effect.succeed(() => {
          clearTimeout(timeout)
        })
      )
    })
}
