import { AbstractClock } from "@effect/core/io/Clock/definition";

export const TestClockId = Symbol.for("@effect/core/io/TestClock");
export type TestClockId = typeof TestClockId;

export const HasTestClock = Service<TestClock>(TestClockId);
export type HasTestClock = Has<TestClock>;

export class TestClock extends AbstractClock {
  private time = new Date().getTime();

  readonly currentTime: UIO<number> = Effect.succeed(this.time);

  sleep(duration: LazyArg<Duration>, __tsplusTrace?: string): UIO<void> {
    return Effect.unit;
  }

  adjust(duration: Duration): UIO<void> {
    return Effect.succeed(() => {
      this.time = this.time + duration.millis;
    });
  }
}
