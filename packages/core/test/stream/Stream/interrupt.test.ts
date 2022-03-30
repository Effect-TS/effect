import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Either } from "../../../src/data/Either"
import { constTrue } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Queue } from "../../../src/io/Queue"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("interruptWhen", () => {
    it("preserves scope of inner fibers", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("queue1", () => Queue.unbounded<Chunk<number>>())
        .bind("queue2", () => Queue.unbounded<Chunk<number>>())
        .tap(({ queue1 }) => queue1.offer(Chunk(1)))
        .tap(({ queue2 }) => queue2.offer(Chunk(2)))
        .tap(({ queue1 }) => queue1.offer(Chunk(3)).fork())
        .tap(({ queue2 }) => queue2.offer(Chunk(4)).fork())
        .bindValue("stream1", ({ queue1 }) => Stream.fromChunkQueue(queue1))
        .bindValue("stream2", ({ queue2 }) => Stream.fromChunkQueue(queue2))
        .bindValue("stream3", ({ promise, stream1, stream2 }) =>
          stream1
            .zipWithLatest(stream2, (a, b) => Tuple(a, b))
            .interruptWhen(promise.await())
            .take(3)
        )
        .tap(({ stream3 }) => stream3.runDrain())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("interrupts the current element", async () => {
      const program = Effect.Do()
        .bind("interrupted", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("halt", () => Promise.make<never, void>())
        .bind("started", () => Promise.make<never, void>())
        .bind("fiber", ({ halt, interrupted, latch, started }) =>
          Stream.fromEffect(
            (started.succeed(undefined) > latch.await()).onInterrupt(() =>
              interrupted.set(true)
            )
          )
            .interruptWhen(halt.await())
            .runDrain()
            .fork()
        )
        .tap(({ halt, started }) => started.await() > halt.succeed(undefined))
        .tap(({ fiber }) => fiber.await())
        .flatMap(({ interrupted }) => interrupted.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("propagates errors", async () => {
      const program = Effect.Do()
        .bind("halt", () => Promise.make<string, never>())
        .tap(({ halt }) => halt.fail("fail"))
        .flatMap(({ halt }) =>
          Stream.fromEffect(Effect.never)
            .interruptWhen(halt.await())
            .runDrain()
            .either()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("fail"))
    })
  })

  describe("interruptWhenPromise", () => {
    it("interrupts the current element", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("queue1", () => Queue.unbounded<Chunk<number>>())
        .bind("queue2", () => Queue.unbounded<Chunk<number>>())
        .tap(({ queue1 }) => queue1.offer(Chunk(1)))
        .tap(({ queue2 }) => queue2.offer(Chunk(2)))
        .tap(({ queue1 }) => queue1.offer(Chunk(3)).fork())
        .tap(({ queue2 }) => queue2.offer(Chunk(4)).fork())
        .bindValue("stream1", ({ queue1 }) => Stream.fromChunkQueue(queue1))
        .bindValue("stream2", ({ queue2 }) => Stream.fromChunkQueue(queue2))
        .bindValue("stream3", ({ promise, stream1, stream2 }) =>
          stream1
            .zipWithLatest(stream2, (a, b) => Tuple(a, b))
            .interruptWhenPromise(promise)
            .take(3)
        )
        .tap(({ stream3 }) => stream3.runDrain())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("propagates errors", async () => {
      const program = Effect.Do()
        .bind("halt", () => Promise.make<string, never>())
        .tap(({ halt }) => halt.fail("fail"))
        .flatMap(({ halt }) =>
          Stream.fromEffect(Effect.never).interruptWhenPromise(halt).runDrain().either()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("fail"))
    })
  })

  // TODO(Mike/Max): implement after TestClock
  // describe("interruptAfter", () => {
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
