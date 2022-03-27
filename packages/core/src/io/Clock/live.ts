import { Either } from "../../data/Either"
import type { UIO } from "../Effect"
import { Effect } from "../Effect"
import { AbstractClock } from "./definition"

export class LiveClock extends AbstractClock {
  currentTime: UIO<number> = Effect.succeed(new Date().getTime())

  sleep(ms: number, __tsplusTrace?: string): UIO<void> {
    // TODO(Max): when we modify this to take a Duration, check if the Duration
    // is Infinity, and if so change this to a setInterval that never completes
    // and clear the interval in the Canceler
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
