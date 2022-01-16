// ets_tracing: off

import type { Effect, UIO } from "../Effect/definition"
import { provideServiceEffect } from "../Effect/operations/provideServiceEffect"
import { serviceWith } from "../Effect/operations/serviceWith"
import { succeed } from "../Effect/operations/succeed"
import { unit } from "../Effect/operations/unit"
import type { Has, Tag } from "../Has"
import { tag } from "../Has"
import { Clock, ClockId } from "./Clock"

export const HasTestClock: Tag<TestClock> = tag<TestClock>(ClockId)

export class TestClock extends Clock {
  private time = new Date().getTime()

  readonly currentTime: UIO<number> = succeed(() => this.time)

  readonly sleep: (ms: number) => UIO<void> = () => unit

  readonly advance = (ms: number) =>
    succeed(() => {
      this.time = this.time + ms
    })

  static advance = (ms: number) => serviceWith(HasTestClock)((_) => _.advance(ms))
}

export function provideTestClock<R, E, A>(
  self: Effect<R & Has<TestClock>, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return provideServiceEffect(HasTestClock)(
    succeed(() => new TestClock()),
    __trace
  )(self)
}
