import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
// import { Either } from "../../../src/data/Either"
// import { identity } from "../../../src/data/Function"
import { RuntimeError } from "../../../src/io/Cause"
// import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Stream } from "../../../src/stream/Stream"
// import { Promise } from "../../../src/io/Promise"
// import { Ref } from "../../../src/io/Ref"
import { Take } from "../../../src/stream/Take"

describe("Stream", () => {
  describe("flattenExitOption", () => {
    it("happy path", async () => {
      const program = Stream.range(0, 10)
        .toQueue(1)
        .use((queue) =>
          Stream.fromQueue(queue)
            .map((take) => take.exit())
            .flattenExitOption()
            .runCollect()
        )
        .map((chunk) => chunk.flatten().toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List.range(0, 10).toArray())
    })

    it("errors", async () => {
      const error = new RuntimeError("boom")
      const program = (Stream.range(0, 10) + Stream.fail(error))
        .toQueue(1)
        .use((queue) =>
          Stream.fromQueue(queue)
            .map((take) => take.exit())
            .flattenExitOption()
            .runCollect()
        )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(error))
    })
  })

  describe("flattenIterables", () => {
    it("flattens a group of iterables", async () => {
      const lists = List(List(1, 2, 3), List.empty<number>(), List(4, 5))
      const program = Stream.fromIterable(lists).flattenIterables().runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(lists.flatten().toArray())
    })
  })

  describe("flattenTake", () => {
    it("happy path", async () => {
      const chunks = Chunk(Chunk(1, 2, 3), Chunk.empty<number>(), Chunk(4, 5))
      const program = Stream.fromChunks(...chunks)
        .mapChunks((chunk) => Chunk.single(Take.chunk(chunk)))
        .flattenTake()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(
        chunks.reduce(Chunk.empty<number>(), (acc, c) => acc + c).toArray()
      )
    })

    it("stop collecting on Exit.Failure", async () => {
      const program = Stream(Take.chunk(Chunk(1, 2)), Take.single(3), Take.end)
        .flattenTake()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })

    it("work with empty chunks", async () => {
      const program = Stream(
        Take.chunk(Chunk.empty<number>()),
        Take.chunk(Chunk.empty<number>())
      )
        .flattenTake()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    it("work with empty streams", async () => {
      const program = Stream.fromIterable(List.empty<Take<never, never>>())
        .flattenTake()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })
  })
})
