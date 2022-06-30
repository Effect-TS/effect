import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("interruptWhen", () => {
    it("preserves scope of inner fibers", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("queue1", () => Queue.unbounded<Chunk<number>>())
        .bind("queue2", () => Queue.unbounded<Chunk<number>>())
        .tap(({ queue1 }) => queue1.offer(Chunk(1)))
        .tap(({ queue2 }) => queue2.offer(Chunk(2)))
        .tap(({ queue1 }) => queue1.offer(Chunk(3)).fork)
        .tap(({ queue2 }) => queue2.offer(Chunk(4)).fork)
        .bindValue("stream1", ({ queue1 }) => Stream.fromChunkQueue(queue1))
        .bindValue("stream2", ({ queue2 }) => Stream.fromChunkQueue(queue2))
        .bindValue("stream3", ({ deferred, stream1, stream2 }) =>
          stream1
            .zipWithLatest(stream2, (a, b) => Tuple(a, b))
            .interruptWhen(deferred.await())
            .take(3))
        .tap(({ stream3 }) => stream3.runDrain)
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("interrupts the current element", async () => {
      const program = Effect.Do()
        .bind("interrupted", () => Ref.make(false))
        .bind("latch", () => Deferred.make<never, void>())
        .bind("halt", () => Deferred.make<never, void>())
        .bind("started", () => Deferred.make<never, void>())
        .bind("fiber", ({ halt, interrupted, latch, started }) =>
          Stream.fromEffect(
            (started.succeed(undefined) > latch.await()).onInterrupt(() => interrupted.set(true))
          )
            .interruptWhen(halt.await())
            .runDrain
            .fork)
        .tap(({ halt, started }) => started.await() > halt.succeed(undefined))
        .tap(({ fiber }) => fiber.await)
        .flatMap(({ interrupted }) => interrupted.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("propagates errors", async () => {
      const program = Effect.Do()
        .bind("halt", () => Deferred.make<string, never>())
        .tap(({ halt }) => halt.fail("fail"))
        .flatMap(({ halt }) =>
          Stream.fromEffect(Effect.never)
            .interruptWhen(halt.await())
            .runDrain
            .either
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("fail"))
    })
  })

  describe.concurrent("interruptWhenDeferred", () => {
    it("interrupts the current element", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("queue1", () => Queue.unbounded<Chunk<number>>())
        .bind("queue2", () => Queue.unbounded<Chunk<number>>())
        .tap(({ queue1 }) => queue1.offer(Chunk(1)))
        .tap(({ queue2 }) => queue2.offer(Chunk(2)))
        .tap(({ queue1 }) => queue1.offer(Chunk(3)).fork)
        .tap(({ queue2 }) => queue2.offer(Chunk(4)).fork)
        .bindValue("stream1", ({ queue1 }) => Stream.fromChunkQueue(queue1))
        .bindValue("stream2", ({ queue2 }) => Stream.fromChunkQueue(queue2))
        .bindValue("stream3", ({ deferred, stream1, stream2 }) =>
          stream1
            .zipWithLatest(stream2, (a, b) => Tuple(a, b))
            .interruptWhenDeferred(deferred)
            .take(3))
        .tap(({ stream3 }) => stream3.runDrain)
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("propagates errors", async () => {
      const program = Effect.Do()
        .bind("halt", () => Deferred.make<string, never>())
        .tap(({ halt }) => halt.fail("fail"))
        .flatMap(({ halt }) => Stream.fromEffect(Effect.never).interruptWhenDeferred(halt).runDrain.either)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("fail"))
    })
  })

  // TODO(Mike/Max): implement after TestClock
  // describe.concurrent("interruptAfter", () => {
  //   test("interrupts after given duration") {
  //     assertWithChunkCoordination(List(Chunk(1), Chunk(2), Chunk(3))) { c =>
  //       assertM(
  //         for {
  //           fiber <- ZStream
  //                      .fromQueue(c.queue)
  //                      .collectWhileSuccess
  //                      .interruptAfter(5.seconds)
  //                      .tap(_ => c.proceed)
  //                      .runCollect
  //                      .fork
  //           _      <- c.offer *> TestClock.adjust(3.seconds) *> c.awaitNext
  //           _      <- c.offer *> TestClock.adjust(3.seconds) *> c.awaitNext
  //           _      <- c.offer
  //           result <- fiber.join
  //         } yield result
  //       )(equalTo(Chunk(Chunk(1), Chunk(2))))
  //     }
  //   },
  //   test("interrupts before first chunk") {
  //     for {
  //       queue  <- Queue.unbounded[Int]
  //       fiber  <- ZStream.fromQueue(queue).interruptAfter(5.seconds).runCollect.fork
  //       _      <- TestClock.adjust(6.seconds)
  //       _      <- queue.offer(1)
  //       result <- fiber.join
  //     } yield assert(result)(isEmpty)
  //   } @@ timeout(10.seconds) @@ flaky
  // })
})
