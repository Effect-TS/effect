import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Duration } from "../../../src/data/Duration"
import { Either } from "../../../src/data/Either"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"
import { Schedule } from "../../../src/io/Schedule"
import { Stream } from "../../../src/stream/Stream"
import { chunkCoordination } from "./test-utils"

describe("Stream", () => {
  describe("fromChunk", () => {
    it("simple example", async () => {
      const chunk = Chunk(1, 2, 3)
      const program = Stream.fromChunk(chunk).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(chunk.toArray())
    })
  })

  describe("fromChunks", () => {
    it("simple example", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3), Chunk(4, 5, 6))
      const program = Stream.fromChunks(...chunks).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(chunks.flatten().toArray())
    })

    it("discards empty chunks", async () => {
      const chunks = Chunk(Chunk.single(1), Chunk.empty<number>(), Chunk.single(2))
      const program = Stream.fromChunks(...chunks)
        .toPull()
        .use((pull) =>
          Effect.forEach(Chunk.range(0, 2), () =>
            pull.map((chunk) => chunk.toArray()).either()
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right([1]),
        Either.right([2]),
        Either.left(Option.none)
      ])
    })
  })

  describe("fromEffect", () => {
    it("failure", async () => {
      const program = Stream.fromEffect(Effect.fail("error")).runCollect().either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("error"))
    })
  })

  describe("fromEffectOption", () => {
    it("emit one element with success", async () => {
      const program = Stream.fromEffectOption(Effect.succeed(5)).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([5])
    })

    it("emit one element with failure", async () => {
      const program = Stream.fromEffectOption(Effect.fail(Option.some(5)))
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(5))
    })

    it("do not emit any element", async () => {
      const program = Stream.fromEffectOption(Effect.fail(Option.none)).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })
  })

  describe("fromIterable", () => {
    it("simple example", async () => {
      const program = Stream.fromIterable([1, 2, 3]).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })
  })

  describe("fromIterableEffect", () => {
    it("simple example", async () => {
      const program = Stream.fromIterableEffect(Effect.succeed([1, 2, 3])).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })
  })

  describe("fromSchedule", () => {
    it("simple example", async () => {
      const schedule = Schedule.exponential(Duration(5)) < Schedule.recurs(5)
      const program = Stream.fromSchedule(schedule).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Duration(5),
        Duration(10),
        Duration(20),
        Duration(40),
        Duration(80)
      ])
    })
  })

  describe("fromQueue", () => {
    it("emits queued elements", async () => {
      const program = chunkCoordination(List(Chunk(1, 2))).flatMap((c) =>
        Effect.Do()
          .bind("fiber", () =>
            Stream.fromQueue(c.queue)
              .collectWhileSuccess()
              .flattenChunks()
              .tap(() => c.proceed)
              .runCollect()
              .fork()
          )
          .tap(() => c.offer)
          .flatMap(({ fiber }) => fiber.join())
      )

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2])
    })

    it("chunks up to the max chunk size", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(Chunk(1, 2, 3, 4, 5, 6, 7)))
        .flatMap(({ queue }) =>
          Stream.fromQueue(queue, 2)
            .mapChunks((chunk) => Chunk.single(chunk.toArray()))
            .take(3)
            .runCollect()
        )

      const result = await program.unsafeRunPromise()

      expect(result.forAll((xs) => xs.length <= 2)).toBe(true)
    })
  })
})
