import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("timeout", () => {
    it("succeed", async () => {
      const program = Stream.succeed(1).timeout(new Duration(Number.MAX_SAFE_INTEGER)).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1))
    })

    it("should end stream", async () => {
      const program = Stream.range(0, 5)
        .tap(() => Effect.never)
        .timeout((0).millis)
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })
  })

  describe.concurrent("timeoutFail", () => {
    it("succeed", async () => {
      const program = Stream.range(0, 5)
        .tap(() => Effect.never)
        .timeoutFail(constFalse, (0).millis)
        .runDrain()
        .map(constTrue)
        .either()
        .map((either) => either.merge)

      const result = await program.unsafeRunPromise()

      assert.isFalse(result)
    })

    it("fail", async () => {
      const program = Stream.fail("original")
        .timeoutFail("timeout", (15).minutes)
        .runDrain()
        .flip()

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "original")
    })
  })

  describe.concurrent("timeoutFailCause", () => {
    it("fail", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.range(0, 5)
        .tap(() => Effect.never)
        .timeoutFailCause(Cause.die(error), (0).millis)
        .runDrain()
        .sandbox()
        .either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.mapLeft((cause) => cause.untraced) == Either.left(Cause.die(error)))
    })
  })

  describe.concurrent("timeoutTo", () => {
    it("succeed", async () => {
      const program = Stream.range(0, 5)
        .timeoutTo(new Duration(Number.MAX_SAFE_INTEGER), Stream.succeed(-1))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1, 2, 3, 4))
    })

    // TODO(Mike/Max): implement after TestClock
    it.skip("should switch stream", async () => {
      // assertWithChunkCoordination(List(Chunk(1), Chunk(2), Chunk(3))) { c =>
      //   assertM(
      //     for {
      //       fiber <- ZStream
      //                  .fromQueue(c.queue)
      //                  .collectWhileSuccess
      //                  .flattenChunks
      //                  .timeoutTo(2.seconds)(ZStream.succeed(4))
      //                  .tap(_ => c.proceed)
      //                  .runCollect()
      //                  .fork
      //       _      <- c.offer *> TestClock.adjust(1.seconds) *> c.awaitNext
      //       _      <- c.offer *> TestClock.adjust(3.seconds) *> c.awaitNext
      //       _      <- c.offer
      //       result <- fiber.join
      //     } yield result
      //   )(equalTo(Chunk(1, 2, 4)))
      // }
    })

    // TODO(Mike/Max): implement after TestClock
    it.skip("should not apply timeout after switch", async () => {
      // for {
      //   queue1 <- Queue.unbounded[Int]
      //   queue2 <- Queue.unbounded[Int]
      //   stream1 = ZStream.fromQueue(queue1)
      //   stream2 = ZStream.fromQueue(queue2)
      //   fiber  <- stream1.timeoutTo(2.seconds)(stream2).runCollect().fork
      //   _      <- queue1.offer(1) *> TestClock.adjust(1.second)
      //   _      <- queue1.offer(2) *> TestClock.adjust(3.second)
      //   _      <- queue1.offer(3)
      //   _      <- queue2.offer(4) *> TestClock.adjust(3.second)
      //   _      <- queue2.offer(5) *> queue2.shutdown
      //   result <- fiber.join
      // } yield assert(result)(equalTo(Chunk(1, 2, 4, 5)))
    })
  })
})
