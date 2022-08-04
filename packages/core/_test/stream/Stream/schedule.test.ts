describe.concurrent("Stream", () => {
  describe.concurrent("schedule", () => {
    it.effect("simple example", () =>
      Do(($) => {
        const start = $(Clock.currentTime)
        const schedule = Schedule.fixed((100).millis)
        const stream = Stream.range(1, 9)
          .schedule(schedule)
          .mapEffect((n) => Clock.currentTime.map((now) => Tuple(n, now - start)))
        const fiber = $(stream.runCollect.fork)
        $(TestClock.adjust((800).millis))
        const result = $(fiber.join)
        const expected = Chunk(
          Tuple(1, 100),
          Tuple(2, 200),
          Tuple(3, 300),
          Tuple(4, 400),
          Tuple(5, 500),
          Tuple(6, 600),
          Tuple(7, 700),
          Tuple(8, 800)
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
