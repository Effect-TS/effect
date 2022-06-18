import { ClockSym, globalScheduler } from "@effect/core/io/Clock/definition"

export class LiveClock implements Clock {
  readonly [ClockSym]: ClockSym = ClockSym

  get currentTime(): Effect<never, never, number> {
    return Effect.succeed(this.unsafeCurrentTime)
  }

  get unsafeCurrentTime(): number {
    return new Date().getTime()
  }

  get scheduler(): Effect<never, never, Clock.Scheduler> {
    return Effect.succeed(globalScheduler)
  }

  sleep(duration: LazyArg<Duration>, __tsplusTrace?: string): Effect<never, never, void> {
    return Effect.succeed(duration).flatMap((duration) =>
      Effect.asyncInterrupt((cb) => {
        const canceler = globalScheduler.unsafeSchedule(() => cb(Effect.unit), duration)
        return Either.left(Effect.succeed(canceler))
      })
    )
  }
}
