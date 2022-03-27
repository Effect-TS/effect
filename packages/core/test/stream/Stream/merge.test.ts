import { Either } from "../../../src/data/Either"
import { constVoid } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("merge", () => {
    it("short circuiting", async () => {
      const program = Stream.mergeAll(2)(Stream.never, Stream(1))
        .take(1)
        .runCollect()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1])
    })

    it("equivalence with set union", async () => {
      const stream1 = Stream(1, 2, 3)
      const stream2 = Stream(3, 4, 5)
      const program = Effect.struct({
        mergedStream: stream1
          .merge(stream2)
          .runCollect()
          .map((chunk) => new Set(chunk)),
        mergedChunks: stream1
          .runCollect()
          .zipWith(stream2.runCollect(), (c1, c2) => c1 + c2)
          .map((chunk) => new Set(chunk))
      })

      const { mergedChunks, mergedStream } = await program.unsafeRunPromise()

      expect(mergedStream).toEqual(mergedChunks)
    })

    it("fail as soon as one stream fails", async () => {
      const program = Stream(1, 2, 3)
        .merge(Stream.fail(undefined))
        .runCollect()
        .exit()
        .map((exit) => exit.isSuccess())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })
  })

  describe("mergeTerminateLeft", () => {
    // TODO(Mike/Max): implement after TestClock
    it.skip("terminates as soon as the first stream terminates", async () => {
      //   for {
      //     queue1 <- Queue.unbounded[Int]
      //     queue2 <- Queue.unbounded[Int]
      //     stream1 = ZStream.fromQueue(queue1)
      //     stream2 = ZStream.fromQueue(queue2)
      //     fiber  <- stream1.mergeTerminateLeft(stream2).runCollect.fork
      //     _      <- queue1.offer(1) *> TestClock.adjust(1.second)
      //     _      <- queue1.offer(2) *> TestClock.adjust(1.second)
      //     _      <- queue1.shutdown *> TestClock.adjust(1.second)
      //     _      <- queue2.offer(3)
      //     result <- fiber.join
      //   } yield assert(result)(equalTo(Chunk(1, 2)))
    })

    it("interrupts pulling on finish", async () => {
      const stream1 = Stream(1, 2, 3)
      const stream2 = Stream.fromEffect(Effect.sleep(5000).as(4))
      const program = stream1
        .mergeTerminateLeft(stream2)
        .runCollect()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })
  })

  describe("mergeTerminateRight", () => {
    // TODO(Mike/Max): implement after TestClock
    it.skip("terminates as soon as the second stream terminates", async () => {
      // for {
      //   queue1 <- Queue.unbounded[Int]
      //   queue2 <- Queue.unbounded[Int]
      //   stream1 = ZStream.fromQueue(queue1)
      //   stream2 = ZStream.fromQueue(queue2)
      //   fiber  <- stream1.mergeTerminateRight(stream2).runCollect.fork
      //   _      <- queue2.offer(2) *> TestClock.adjust(1.second)
      //   _      <- queue2.offer(3) *> TestClock.adjust(1.second)
      //   _      <- queue2.shutdown *> TestClock.adjust(1.second)
      //   _      <- queue1.offer(1)
      //   result <- fiber.join
      // } yield assert(result)(equalTo(Chunk(2, 3)))
    })
  })

  describe("mergeTerminateEither", () => {
    it.skip("terminates as soon as either stream terminates", async () => {
      // TODO(Mike/Max): implement after TestClock
      // for {
      //   queue1 <- Queue.unbounded[Int]
      //   queue2 <- Queue.unbounded[Int]
      //   stream1 = ZStream.fromQueue(queue1)
      //   stream2 = ZStream.fromQueue(queue2)
      //   fiber  <- stream1.mergeTerminateEither(stream2).runCollect.fork
      //   _      <- queue1.shutdown
      //   _      <- TestClock.adjust(1.second)
      //   _      <- queue2.offer(1)
      //   result <- fiber.join
      // } yield assert(result)(isEmpty)
    })
  })

  describe("mergeWith", () => {
    it("prioritizes failure", async () => {
      const stream1 = Stream.never
      const stream2 = Stream.fail("ouch")
      const program = stream1
        .mergeWith(stream2, constVoid, constVoid)
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })
  })
})
