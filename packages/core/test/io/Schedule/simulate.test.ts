import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Schedule", () => {
  describe.concurrent("simulate a schedule", () => {
    it("without timing out", () =>
      Do(($) => {
        const schedule = Schedule.exponential((1).minutes)
        const result = $(
          Clock.currentTime.flatMap((now) => schedule.run(now, Chunk.fill(5, constVoid)))
        )
        const expected = Chunk((1).minutes, (2).minutes, (4).minutes, (8).minutes, (16).minutes)
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("respect Schedule.recurs even if more input is provided than needed", () =>
      Do(($) => {
        const schedule = Schedule.recurs(2).intersect(Schedule.exponential((1).minutes))
        const result = $(Clock.currentTime.flatMap((now) => schedule.run(now, Chunk.range(1, 10))))
        const expected = Chunk(
          [0, (1).minutes] as const,
          [1, (2).minutes] as const,
          [2, (4).minutes] as const
        )
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("respect Schedule.upTo even if more input is provided than needed", () =>
      Do(($) => {
        const schedule = Schedule.spaced((1).seconds).upTo((5).seconds)
        const result = $(Clock.currentTime.flatMap((now) => schedule.run(now, Chunk.range(1, 10))))
        const expected = Chunk(0, 1, 2, 3, 4, 5)
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("free from stack overflow", () =>
      Do(($) => {
        const schedule = Schedule.repeatForever.zipRight(Schedule.recurs(1000))
        const result = $(Stream.fromSchedule(schedule).runCount)
        assert.strictEqual(result, 1000)
      }).unsafeRunPromise(), 10_000)
  })
})
