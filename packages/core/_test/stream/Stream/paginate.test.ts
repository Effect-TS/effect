import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("paginate", () => {
    it("simple example", async () => {
      const s = Tuple(0, List(1, 2, 3))
      const program = Stream.paginate(s, ({ tuple: [x, list] }) =>
        list.foldLeft(Tuple(x, Option.none), (head, tail) =>
          Tuple(x, Option.some(Tuple(head, tail)))
        )
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0, 1, 2, 3])
    })
  })

  describe("paginateEffect", () => {
    it("simple example", async () => {
      const s = Tuple(0, List(1, 2, 3))
      const program = Stream.paginateEffect(s, ({ tuple: [x, list] }) =>
        list.foldLeft(Effect.succeed(Tuple(x, Option.none)), (head, tail) =>
          Effect.succeed(Tuple(x, Option.some(Tuple(head, tail))))
        )
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0, 1, 2, 3])
    })
  })

  describe("paginateChunk", () => {
    it("paginateChunk", async () => {
      const s = Tuple(Chunk.single(0), List(1, 2, 3, 4, 5))
      const pageSize = 2
      const program = Stream.paginateChunk(s, ({ tuple: [x, list] }) =>
        list.isEmpty()
          ? Tuple(x, Option.none)
          : Tuple(
              x,
              Option.some(Tuple(Chunk.from(list.take(pageSize)), list.drop(pageSize)))
            )
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0, 1, 2, 3, 4, 5])
    })
  })

  it("paginateChunkEffect", async () => {
    const s = Tuple(Chunk.single(0), List(1, 2, 3, 4, 5))
    const pageSize = 2
    const program = Stream.paginateChunkEffect(s, ({ tuple: [x, list] }) =>
      list.isEmpty()
        ? Effect.succeed(Tuple(x, Option.none))
        : Effect.succeed(
            Tuple(
              x,
              Option.some(Tuple(Chunk.from(list.take(pageSize)), list.drop(pageSize)))
            )
          )
    ).runCollect()

    const result = await program.unsafeRunPromise()

    expect(result.toArray()).toEqual([0, 1, 2, 3, 4, 5])
  })
})
