describe.concurrent("Stream", () => {
  describe.concurrent("schedule", () => {
    // TODO(Mike/Max): implement after TestClock
    it.skip("simple example", async () => {
      // const program = Effect.Do()
      //   .bind("start", () => Clock.currentTime)
      //   .bind("fiber", ({ start }) =>
      //     Stream.range(1, 9)
      //       .schedule(Schedule.fixed(Duration(10)))
      //       .mapEffect((n) => Clock.currentTime.map((now) => Tuple(n, now - start)))
      //       .runCollect()
      //       .fork()
      //   )
      //   .flatMap(({ fiber }) => fiber.join())
      // const result = await program.unsafeRunPromise()
      // expected = Chunk((1, 100L), (2, 200L), (3, 300L), (4, 400L), (5, 500L), (6, 600L), (7, 700L), (8, 800L))
    });
  });

  describe.concurrent("scheduleWith", () => {
    // TODO(Mike/Max): implement after TestClock
    it.skip("simple example", async () => {
      // assertM(
      //   ZStream("A", "B", "C", "A", "B", "C")
      //     .scheduleWith(Schedule.recurs(2) *> Schedule.fromFunction((_) => "Done"))(
      //       _.toLowerCase,
      //       identity
      //     )
      //     .runCollect
      // )(equalTo(Chunk("a", "b", "c", "Done", "a", "b", "c", "Done")))
    });
  });

  describe.concurrent("scheduleEither", () => {
    // TODO(Mike/Max): implement after TestClock
    it.skip("simple example", async () => {
      //   assertM(
      //     ZStream("A", "B", "C")
      //       .scheduleEither(Schedule.recurs(2) *> Schedule.fromFunction((_) => "!"))
      //       .runCollect
      //   )(equalTo(Chunk(Right("A"), Right("B"), Right("C"), Left("!"))))
    });
  });
});
