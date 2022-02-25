import { Either } from "../../data/Either"
import type { UIO } from "../Effect"
import { Effect } from "../Effect"
import { AbstractClock } from "./definition"

export class LiveClock extends AbstractClock {
  currentTime: UIO<number> = Effect.succeed(new Date().getTime())

  sleep(ms: number, __tsplusTrace?: string): UIO<void> {
    return Effect.asyncInterrupt((cb) => {
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
}
