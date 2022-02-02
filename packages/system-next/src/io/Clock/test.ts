import type { Has, Tag } from "../../data/Has"
import { tag } from "../../data/Has"
import type { UIO } from "../Effect"
import { Effect } from "../Effect"
import { Clock, ClockId } from "./definition"

export const HasTestClock: Tag<TestClock> = tag<TestClock>(ClockId)

export class TestClock extends Clock {
  private time = new Date().getTime()

  readonly currentTime: UIO<number> = Effect.succeed(this.time)

  readonly sleep = (ms: number, __etsTrace?: string): UIO<void> => Effect.unit

  readonly advance = (ms: number, __etsTrace?: string): UIO<void> =>
    Effect.succeed(() => {
      this.time = this.time + ms
    })

  static advance = (
    ms: number,
    __etsTrace?: string
  ): Effect<Has<TestClock>, never, UIO<void>> =>
    Effect.serviceWith(HasTestClock)((_) => _.advance(ms))
}

export function provideTestClock<R, E, A>(
  self: Effect<R & Has<TestClock>, E, A>,
  __etsTrace?: string
): Effect<R, E, A> {
  return self.provideServiceEffect(HasTestClock)(
    Effect.succeed(new TestClock())
  ) as Effect<R, E, A>
}
