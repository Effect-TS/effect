import type { Duration } from "../../data/Duration"
import { Either } from "../../data/Either"
import type { LazyArg } from "../../data/Function"
import type { UIO } from "../Effect"
import { Effect } from "../Effect"
import { AbstractClock } from "./definition"

const MAX_SET_INTERVAL_VALUE = 2 ** 31 - 1

export class LiveClock extends AbstractClock {
  currentTime: UIO<number> = Effect.succeed(new Date().getTime())

  sleep(duration: LazyArg<Duration>, __tsplusTrace?: string): UIO<void> {
    return Effect.succeed(duration).flatMap((duration) => {
      // If the duration is greater than the value allowable by the JS timer
      // functions, default to Effect.never
      if (duration.milliseconds > MAX_SET_INTERVAL_VALUE) {
        return Effect.never
      }
      return Effect.asyncInterrupt((cb) => {
        const timeout = setTimeout(() => {
          cb(Effect.unit)
        }, duration.milliseconds)

        return Either.left(
          Effect.succeed(() => {
            clearTimeout(timeout)
          })
        )
      })
    })
  }
}
