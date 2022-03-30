import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Either } from "../../../src/data/Either"
import { constFalse } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("take", () => {
    it("equivalence with Chunk.take", async () => {
      const stream = Stream(0, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        streamResult: stream.take(3).runCollect(),
        chunkResult: stream.runCollect().map((chunk) => chunk.take(3))
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      expect(streamResult.toArray()).toEqual(chunkResult.toArray())
    })

    it("take short circuits", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bindValue("stream", ({ ref }) =>
          (Stream(1) + Stream.fromEffect(ref.set(true)).drain()).take(0)
        )
        .tap(({ stream }) => stream.runDrain())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("take(0) short circuits", async () => {
      const program = Stream.never.take(0).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    it("take(1) short circuits", async () => {
      const program = (Stream(1) + Stream.never).take(1).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1])
    })
  })

  describe("takeRight", () => {
    it("equivalence with Chunk.takeRight", async () => {
      const stream = Stream(0, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        streamResult: stream.takeRight(3).runCollect(),
        chunkResult: stream.runCollect().map((chunk) => chunk.takeRight(3))
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      expect(streamResult.toArray()).toEqual(chunkResult.toArray())
    })
  })

  describe("takeUntil", () => {
    it("equivalence with negated Chunk.takeWhile", async () => {
      const f = (n: number) => n > 3
      const stream = Stream(0, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        streamResult: stream.takeUntil(f).runCollect(),
        chunkResult: stream
          .runCollect()
          .map(
            (chunk) =>
              chunk.takeWhile((n) => !f(n)) + chunk.dropWhile((n) => !f(n)).take(1)
          )
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      expect(streamResult.toArray()).toEqual(chunkResult.toArray())
    })
  })

  describe("takeUntilEffect", () => {
    it("equivalence with negated Chunk.takeWhileEffect", async () => {
      const f = (n: number) => Effect.succeed(n > 3)
      const stream = Stream(0, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        streamResult: stream.takeUntilEffect(f).runCollect(),
        chunkResult: stream.runCollect().flatMap((chunk) =>
          chunk
            .takeWhileEffect((n) => f(n).negate())
            .zipWith(
              chunk.dropWhileEffect((n) => f(n).negate()).map((chunk) => chunk.take(1)),
              (a, b) => a + b
            )
        )
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      expect(streamResult.toArray()).toEqual(chunkResult.toArray())
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3)
        .takeUntilEffect((n) =>
          n === 2 ? Effect.fail("boom") : Effect.succeed(constFalse)
        )
        .either()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right(1),
        Either.right(2),
        Either.left("boom")
      ])
    })
  })

  describe("takeWhile", () => {
    it("equivalence with Chunk.takeWhile", async () => {
      const f = (n: number) => n < 3
      const stream = Stream(0, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        streamResult: stream.takeWhile(f).runCollect(),
        chunkResult: stream.runCollect().map((chunk) => chunk.takeWhile(f))
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      expect(streamResult.toArray()).toEqual(chunkResult.toArray())
    })

    it("takeWhile doesn't stop when hitting an empty chunk (ZIO issue #4272)", async () => {
      const program = Stream.fromChunks(Chunk(1), Chunk(2), Chunk(3))
        .mapChunks((chunk) =>
          chunk.flatMap((n) => (n === 2 ? Chunk.empty() : Chunk(n)))
        )
        .takeWhile((n) => n !== 4)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 3])
    })

    it("takeWhile short circuits", async () => {
      const program = (Stream(1) + Stream("ouch"))
        .takeWhile(constFalse)
        .runDrain()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(undefined))
    })
  })
})
