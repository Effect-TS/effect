describe.concurrent("Stream", () => {
  describe.concurrent("debounce", () => {
    // TODO(Mike/Max): implement after TestClock
    it.skip("should drop earlier chunks within waitTime", async () => {
      //   assertWithChunkCoordination(List(Chunk(1), Chunk(3, 4), Chunk(5), Chunk(6, 7))) { c =>
      //     val stream = ZStream
      //       .fromQueue(c.queue)
      //       .collectWhileSuccess
      //       .debounce(1.second)
      //       .tap(_ => c.proceed)
      //     assertM(for {
      //       fiber  <- stream.runCollect.fork
      //       _      <- c.offer.fork
      //       _      <- (Clock.sleep(500.millis) *> c.offer).fork
      //       _      <- (Clock.sleep(2.seconds) *> c.offer).fork
      //       _      <- (Clock.sleep(2500.millis) *> c.offer).fork
      //       _      <- TestClock.adjust(3500.millis)
      //       result <- fiber.join
      //     } yield result)(equalTo(Chunk(Chunk(3, 4), Chunk(6, 7))))
      //   }
    })

    // TODO(Mike/Max): implement after TestClock
    it.skip("should take latest chunk within waitTime", async () => {
      // assertWithChunkCoordination(List(Chunk(1, 2), Chunk(3, 4), Chunk(5, 6))) { c =>
      //   val stream = ZStream
      //     .fromQueue(c.queue)
      //     .collectWhileSuccess
      //     .debounce(1.second)
      //     .tap(_ => c.proceed)
      //   assertM(for {
      //     fiber  <- stream.runCollect.fork
      //     _      <- c.offer *> c.offer *> c.offer
      //     _      <- TestClock.adjust(1.second)
      //     result <- fiber.join
      //   } yield result)(equalTo(Chunk(Chunk(5, 6))))
      // }
    })

    // TODO(Mike/Max): implement after TestClock
    it.skip("should work properly with parallelization", async () => {
      // assertWithChunkCoordination(List(Chunk(1), Chunk(2), Chunk(3))) { c =>
      //   val stream = ZStream
      //     .fromQueue(c.queue)
      //     .collectWhileSuccess
      //     .debounce(1.second)
      //     .tap(_ => c.proceed)
      //   assertM(for {
      //     fiber  <- stream.runCollect.fork
      //     _      <- ZIO.collectAllParDiscard(List(c.offer, c.offer, c.offer))
      //     _      <- TestClock.adjust(1.second)
      //     result <- fiber.join
      //   } yield result)(hasSize(equalTo(1)))
    })

    // TODO(Mike/Max): implement after TestClock
    it.skip("should handle empty chunks properly", async () => {
      // for {
      //   fiber  <- ZStream(1, 2, 3).fixed(500.millis).debounce(1.second).runCollect.fork
      //   _      <- TestClock.adjust(3.seconds)
      //   result <- fiber.join
      // } yield assert(result)(equalTo(Chunk(3)))
    })

    it("should fail immediately", async () => {
      const program = Stream.fromEffect(Effect.fail(Maybe.none))
        .debounce((100_000_000).millis)
        .runCollect
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(Maybe.none))
    })

    it("should work with empty streams", async () => {
      const program = Stream.empty.debounce((100_000_000).millis).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    // TODO(Mike/Max): implement after TestClock
    it.skip("should pick last element from every chunk", async () => {
      // assertM(for {
      //   fiber  <- ZStream(1, 2, 3).debounce(1.second).runCollect.fork
      //   _      <- TestClock.adjust(1.second)
      //   result <- fiber.join
      // } yield result)(equalTo(Chunk(3)))
    })

    // TODO(Mike/Max): implement after TestClock
    it.skip("should interrupt fibers properly", async () => {
      // assertWithChunkCoordination(List(Chunk(1), Chunk(2), Chunk(3))) { c =>
      //   for {
      //     fib <- ZStream
      //              .fromQueue(c.queue)
      //              .tap(_ => c.proceed)
      //              .flatMap(ex => ZStream.fromZIOMaybe(ZIO.done(ex)))
      //              .flattenChunks
      //              .debounce(200.millis)
      //              .interruptWhen(ZIO.never)
      //              .take(1)
      //              .runCollect
      //              .fork
      //     _       <- (c.offer *> TestClock.adjust(100.millis) *> c.awaitNext).repeatN(3)
      //     _       <- TestClock.adjust(100.millis)
      //     results <- fib.join
      //   } yield assert(results)(equalTo(Chunk(3)))
      // }
    })

    // TODO(Mike/Max): implement after TestClock
    it.skip("should interrupt children fiber on stream interruption", async () => {
      // for {
      //   ref <- Ref.make(false)
      //   fiber <- (ZStream.fromZIO(ZIO.unit) ++ ZStream.fromZIO(ZIO.never.onInterrupt(ref.set(true))))
      //              .debounce(800.millis)
      //              .runDrain()
      //              .fork
      //   _     <- TestClock.adjust(1.minute)
      //   _     <- fiber.interrupt
      //   value <- ref.get
      // } yield assert(value)(equalTo(true))
    })
  })
})
