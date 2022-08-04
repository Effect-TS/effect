import { DurationInternal } from "@tsplus/stdlib/data/Duration"

describe.concurrent("Effect", () => {
  describe.concurrent("schedule", () => {
    it.effect("runs effect for each recurrence of the schedule", () =>
      Do(($) => {
        const ref = $(Ref.make(List.empty<Duration>()))
        const effect = Clock.currentTime.flatMap((duration) =>
          ref.update((list) => list.prepend(new DurationInternal(duration)))
        )
        const schedule = Schedule.spaced((1).seconds).intersect(Schedule.recurs(5))
        $(effect.schedule(schedule).fork)
        $(TestClock.adjust((5).seconds))
        const value = $(ref.get.map((list) => list.reverse))
        const expected = List((1).seconds, (2).seconds, (3).seconds, (4).seconds, (5).seconds)
        assert.isTrue(value == expected)
      }))
  })
})
