import { ClockSym, globalScheduler } from "@effect/core/io/Clock/definition"

export class LiveClock implements Clock {
  readonly [ClockSym]: ClockSym = ClockSym

  get currentTime(): Effect<never, never, number> {
    return Effect.sync(this.unsafeCurrentTime)
  }

  get unsafeCurrentTime(): number {
    return new Date().getTime()
  }

  get scheduler(): Effect<never, never, Clock.Scheduler> {
    return Effect.succeed(globalScheduler)
  }

  sleep(duration: Duration): Effect<never, never, void> {
    return Effect.asyncInterrupt((cb) => {
      const canceler = globalScheduler.unsafeSchedule(() => cb(Effect.unit), duration)
      return Either.left(Effect.sync(canceler).unit)
    })
  }
}
