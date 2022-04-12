import { ClockSym, globalScheduler } from "@effect/core/io/Clock/definition";

export class LiveClock implements Clock {
  readonly [ClockSym]: ClockSym = ClockSym;

  get currentTime(): UIO<number> {
    return Effect.succeed(this.unsafeCurrentTime);
  }

  get unsafeCurrentTime(): number {
    return new Date().getTime();
  }

  get scheduler(): UIO<Clock.Scheduler> {
    return Effect.succeed(globalScheduler);
  }

  sleep(duration: LazyArg<Duration>, __tsplusTrace?: string): UIO<void> {
    return Effect.succeed(duration).flatMap((duration) =>
      Effect.asyncInterrupt((cb) => {
        const canceler = globalScheduler.unsafeSchedule(() => cb(Effect.unit), duration);
        return Either.left(Effect.succeed(canceler));
      })
    );
  }
}

/**
 * @tsplus static ets/Clock/Ops live
 */
export const live: Layer<unknown, never, Has<Clock>> = Layer.fromEffect(Clock.Tag)(Effect.succeed(new LiveClock()));
