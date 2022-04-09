describe.concurrent("Stream", () => {
  describe.concurrent("haltWhen", () => {
    it("halts after the current element", async () => {
      const program = Effect.Do()
        .bind("interrupted", () => Ref.make(false))
        .bind("latch", () => Deferred.make<never, void>())
        .bind("halt", () => Deferred.make<never, void>())
        .tap(({ halt, interrupted, latch }) =>
          Stream.fromEffect(latch.await().onInterrupt(() => interrupted.set(true)))
            .haltWhen(halt.await())
            .runDrain()
            .fork()
        )
        .tap(({ halt }) => halt.succeed(undefined))
        .tap(({ latch }) => latch.succeed(undefined))
        .flatMap(({ interrupted }) => interrupted.get());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("propagates errors", async () => {
      const program = Effect.Do()
        .bind("halt", () => Deferred.make<string, never>())
        .tap(({ halt }) => halt.fail("fail"))
        .flatMap(({ halt }) => Stream(0).forever().haltWhen(halt.await()).runDrain().either());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Either.left("fail"));
    });
  });

  describe.concurrent("haltWhenDeferred", () => {
    it("halts after the current element", async () => {
      const program = Effect.Do()
        .bind("interrupted", () => Ref.make(false))
        .bind("latch", () => Deferred.make<never, void>())
        .bind("halt", () => Deferred.make<never, void>())
        .tap(({ halt, interrupted, latch }) =>
          Stream.fromEffect(latch.await().onInterrupt(() => interrupted.set(true)))
            .haltWhenDeferred(halt)
            .runDrain()
            .fork()
        )
        .tap(({ halt }) => halt.succeed(undefined))
        .tap(({ latch }) => latch.succeed(undefined))
        .flatMap(({ interrupted }) => interrupted.get());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("propagates errors", async () => {
      const program = Effect.Do()
        .bind("halt", () => Deferred.make<string, never>())
        .tap(({ halt }) => halt.fail("fail"))
        .flatMap(({ halt }) => Stream(0).forever().haltWhenDeferred(halt).runDrain().either());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Either.left("fail"));
    });
  });

  // TODO(Mike/Max): implement after TestClock
  // describe.concurrent("haltAfter", () => {
  //   it("halts after given duration", async () => {
  //     assertWithChunkCoordination(List(Chunk(1), Chunk(2), Chunk(3), Chunk(4))) { c =>
  //       assertM(
  //         for {
  //           fiber <- ZStream
  //                      .fromQueue(c.queue)
  //                      .collectWhileSuccess
  //                      .haltAfter(5.seconds)
  //                      .tap(_ => c.proceed)
  //                      .runCollect
  //                      .fork
  //           _      <- c.offer *> TestClock.adjust(3.seconds) *> c.awaitNext
  //           _      <- c.offer *> TestClock.adjust(3.seconds) *> c.awaitNext
  //           _      <- c.offer *> TestClock.adjust(3.seconds) *> c.awaitNext
  //           _      <- c.offer
  //           result <- fiber.join
  //         } yield result
  //       )(equalTo(Chunk(Chunk(1), Chunk(2), Chunk(3))))
  //     }
  //   })

  //   it("will process first chunk", async () => {
  //     for {
  //       queue  <- Queue.unbounded[Int]
  //       fiber  <- ZStream.fromQueue(queue).haltAfter(5.seconds).runCollect.fork
  //       _      <- TestClock.adjust(6.seconds)
  //       _      <- queue.offer(1)
  //       result <- fiber.join
  //     } yield assert(result)(equalTo(Chunk(1)))
  //   })
  // })
});
