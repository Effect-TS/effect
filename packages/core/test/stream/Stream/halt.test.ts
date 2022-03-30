import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("haltWhen", () => {
    it("halts after the current element", async () => {
      const program = Effect.Do()
        .bind("interrupted", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("halt", () => Promise.make<never, void>())
        .tap(({ halt, interrupted, latch }) =>
          Stream.fromEffect(latch.await().onInterrupt(() => interrupted.set(true)))
            .haltWhen(halt.await())
            .runDrain()
            .fork()
        )
        .tap(({ halt }) => halt.succeed(undefined))
        .tap(({ latch }) => latch.succeed(undefined))
        .flatMap(({ interrupted }) => interrupted.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(false)
    })

    it("propagates errors", async () => {
      const program = Effect.Do()
        .bind("halt", () => Promise.make<string, never>())
        .tap(({ halt }) => halt.fail("fail"))
        .flatMap(({ halt }) =>
          Stream(0).forever().haltWhen(halt.await()).runDrain().either()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("fail"))
    })
  })

  describe("haltWhenPromise", () => {
    test("halts after the current element", async () => {
      const program = Effect.Do()
        .bind("interrupted", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("halt", () => Promise.make<never, void>())
        .tap(({ halt, interrupted, latch }) =>
          Stream.fromEffect(latch.await().onInterrupt(() => interrupted.set(true)))
            .haltWhenPromise(halt)
            .runDrain()
            .fork()
        )
        .tap(({ halt }) => halt.succeed(undefined))
        .tap(({ latch }) => latch.succeed(undefined))
        .flatMap(({ interrupted }) => interrupted.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(false)
    })

    it("propagates errors", async () => {
      const program = Effect.Do()
        .bind("halt", () => Promise.make<string, never>())
        .tap(({ halt }) => halt.fail("fail"))
        .flatMap(({ halt }) =>
          Stream(0).forever().haltWhenPromise(halt).runDrain().either()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("fail"))
    })
  })

  // TODO(Mike/Max): implement after TestClock
  // describe("haltAfter", () => {
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
})
