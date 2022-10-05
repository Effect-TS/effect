describe.concurrent("Stream", () => {
  describe.concurrent("schedule", () => {
    it.effect("simple example", () =>
      Do(($) => {
        const start = $(Clock.currentTime)
        const schedule = Schedule.fixed((100).millis)
        const stream = Stream.range(1, 9)
          .schedule(schedule)
          .mapEffect((n) => Clock.currentTime.map((now) => [n, now - start] as const))
        const fiber = $(stream.runCollect.fork)
        $(TestClock.adjust((800).millis))
        const result = $(fiber.join)
        const expected = Chunk(
          [1, 100] as const,
          [2, 200] as const,
          [3, 300] as const,
          [4, 400] as const,
          [5, 500] as const,
          [6, 600] as const,
          [7, 700] as const,
          [8, 800] as const
        )
        assert.isTrue(result == expected)
      }))
  })

  describe.concurrent("scheduleWith", () => {
    it.effect("simple example", () =>
      Do(($) => {
        const f = (s: string) => s.toLowerCase()
        const schedule = Schedule.recurs(2).zipRight(Schedule.fromFunction(() => "Done"))
        const stream = Stream("A", "B", "C", "A", "B", "C").scheduleWith(schedule, f, identity)
        const result = $(stream.runCollect)
        const expected = Chunk("a", "b", "c", "Done", "a", "b", "c", "Done")
        assert.isTrue(result == expected)
      }))
  })

  describe.concurrent("scheduleEither", () => {
    it.effect("simple example", () =>
      Do(($) => {
        const schedule = Schedule.recurs(2).zipRight(Schedule.fromFunction(() => "!"))
        const stream = Stream("A", "B", "C").scheduleEither(schedule)
        const result = $(stream.runCollect)
        const expected = Chunk(
          Either.right("A"),
          Either.right("B"),
          Either.right("C"),
          Either.left("!")
        )
        assert.isTrue(result == expected)
      }))
  })
})
