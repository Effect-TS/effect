describe.concurrent("Stream", () => {
  describe.concurrent("repeat", () => {
    it("simple example", async () => {
      const program = Stream(1).repeat(Schedule.recurs(4)).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 1, 1, 1, 1))
    })

    it("short circuits", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<List<number>>(List.empty()))
        .bind("fiber", ({ ref }) =>
          Stream.fromEffect(ref.update((list) => list.prepend(1)))
            .repeat(Schedule.spaced((10).millis))
            .take(2)
            .runDrain()
            .fork())
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 1))
    })

    it("does not swallow errors on a repetition", async () => {
      const program = Ref.make(0).flatMap((counter) =>
        Stream.fromEffect(
          counter
            .getAndUpdate((n) => n + 1)
            .flatMap((n) => (n <= 2 ? Effect.succeed(n) : Effect.fail("boom")))
        )
          .repeat(Schedule.recurs(3))
          .runDrain()
          .exit()
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.untraced() == Exit.fail("boom"))
    })
  })

  describe.concurrent("repeatEffect", () => {
    it("emit elements", async () => {
      const program = Stream.repeatEffect(Effect.succeed(1)).take(2).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 1))
    })
  })

  describe.concurrent("repeatEffectOption", () => {
    it("emit elements", async () => {
      const program = Stream.repeatEffectOption(Effect.succeed(1)).take(2).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 1))
    })

    it("emit elements until pull fails with None", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("effect", ({ ref }) =>
          ref
            .updateAndGet((n) => n + 1)
            .flatMap((n) => (n >= 5 ? Effect.fail(Option.none) : Effect.succeed(n))))
        .flatMap(({ effect }) => Stream.repeatEffectOption(effect).take(10).runCollect())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4))
    })

    it("stops evaluating the effect once it fails with None", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Effect.scoped(
            Stream.repeatEffectOption(
              ref.getAndUpdate((n) => n + 1) > Effect.fail(Option.none)
            )
              .toPull()
              .flatMap((pull) => pull.ignore() > pull.ignore())
          )
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })

  describe.concurrent("repeatEither", () => {
    it("emits schedule output", async () => {
      const program = Stream(1).repeatEither(Schedule.recurs(4)).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Either.right(1),
          Either.right(1),
          Either.left(0),
          Either.right(1),
          Either.left(1),
          Either.right(1),
          Either.left(2),
          Either.right(1),
          Either.left(3)
        )
      )
    })

    it("short circuits", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<List<number>>(List.empty()))
        .bind("fiber", ({ ref }) =>
          Stream.fromEffect(ref.update((list) => list.prepend(1)))
            .repeatEither(Schedule.spaced((10).millis))
            .take(3)
            .runDrain()
            .fork())
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 1))
    })
  })

  describe.concurrent("repeatElements", () => {
    it("repeatElementsWith", async () => {
      const program = Stream("A", "B", "C")
        .repeatElementsWith(
          Schedule.recurs(0) > Schedule.fromFunction(() => 123),
          identity,
          (n) => n.toString()
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("A", "123", "B", "123", "C", "123"))
    })

    it("repeatElementsEither", async () => {
      const program = Stream("A", "B", "C")
        .repeatElementsEither(Schedule.recurs(0) > Schedule.fromFunction(() => 123))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Either.right("A"),
          Either.left(123),
          Either.right("B"),
          Either.left(123),
          Either.right("C"),
          Either.left(123)
        )
      )
    })

    it("repeated && assert spaced", async () => {
      const program = Stream("A", "B", "C").repeatElements(Schedule.once).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("A", "A", "B", "B", "C", "C"))
    })

    it("short circuits in schedule", async () => {
      const program = Stream("A", "B", "C")
        .repeatElements(Schedule.once)
        .take(4)
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("A", "A", "B", "B"))
    })

    it("short circuits after schedule", async () => {
      const program = Stream("A", "B", "C")
        .repeatElements(Schedule.once)
        .take(3)
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("A", "A", "B"))
    })
  })

  describe.concurrent("repeatEffectWithSchedule", () => {
    it("succeed", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<List<number>>(List.empty()))
        .bind("fiber", ({ ref }) =>
          Stream.repeatEffectWithSchedule(
            ref.update((list) => list.prepend(1)),
            Schedule.spaced((10).millis)
          )
            .take(2)
            .runDrain())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 1))
    })

    it("allow schedule rely on effect value", async () => {
      const length = 20
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("effect", ({ ref }) => ref.getAndUpdate((n) => n + 1).filterOrFail((n) => n <= length, undefined))
        .bindValue("schedule", () => Schedule.identity<number>().whileInput((n) => n < length))
        .flatMap(({ effect, schedule }) => Stream.repeatEffectWithSchedule(effect, schedule).runCollect())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(0, length))
    })

    it("should perform repetitions in addition to the first execution (one repetition)", async () => {
      const program = Stream.repeatEffectWithSchedule(
        Effect.succeed(1),
        Schedule.once
      ).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 1))
    })

    it("should perform repetitions in addition to the first execution (zero repetitions)", async () => {
      const program = Stream.repeatEffectWithSchedule(
        Effect.succeed(1),
        Schedule.stop
      ).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1))
    })

    // TODO(Max/Mike): implement after TestClock
    it.skip("emits before delaying according to the schedule", async () => {
      // val interval = 1.second
      // for {
      //   collected <- Ref.make(0)
      //   effect     = ZIO.unit
      //   schedule   = Schedule.spaced(interval)
      //   streamFiber <- ZStream
      //                    .repeatZIOWithSchedule(effect, schedule)
      //                    .tap(_ => collected.update(_ + 1))
      //                    .runDrain
      //                    .fork
      //   _                      <- TestClock.adjust(0.seconds)
      //   nrCollectedImmediately <- collected.get
      //   _                      <- TestClock.adjust(1.seconds)
      //   nrCollectedAfterDelay  <- collected.get
      //   _                      <- streamFiber.interrupt
      // } yield assert(nrCollectedImmediately)(equalTo(1)) && assert(nrCollectedAfterDelay)(equalTo(2))
    })
  })
})
