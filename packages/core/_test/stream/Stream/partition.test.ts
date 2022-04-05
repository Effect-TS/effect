import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("partitionEither", () => {
    it("allows repeated runs without hanging", async () => {
      const stream = Stream.fromIterable(Chunk.empty<number>())
        .partitionEither((i) =>
          Effect.succeedNow(i % 2 === 0 ? Either.left(i) : Either.right(i))
        )
        .map(({ tuple: [evens, odds] }) => evens.mergeEither(odds))
        .flatMap((stream) => stream.runCollect())
      const program = Effect.collectAll(
        Chunk.range(0, 50).map(() => Effect.scoped(stream))
      ).map(() => 0)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("values", async () => {
      const program = Effect.scoped(
        Stream.range(0, 6)
          .partitionEither((i) =>
            i % 2 === 0
              ? Effect.succeedNow(Either.left(i))
              : Effect.succeedNow(Either.right(i))
          )
          .flatMap(({ tuple: [evens, odds] }) =>
            Effect.struct({
              evens: evens.runCollect().map((chunk) => chunk.toArray()),
              odds: odds.runCollect().map((chunk) => chunk.toArray())
            })
          )
      )

      const { evens, odds } = await program.unsafeRunPromise()

      expect(evens).toEqual([0, 2, 4])
      expect(odds).toEqual([1, 3, 5])
    })

    it("errors", async () => {
      const program = Effect.scoped(
        (Stream.range(0, 1) + Stream.fail("boom"))
          .partitionEither((i) =>
            i % 2 === 0
              ? Effect.succeedNow(Either.left(i))
              : Effect.succeedNow(Either.right(i))
          )
          .flatMap(({ tuple: [evens, odds] }) =>
            Effect.struct({
              evens: evens.runCollect().either(),
              odds: odds.runCollect().either()
            })
          )
      )

      const { evens, odds } = await program.unsafeRunPromise()

      expect(evens).toEqual(Either.left("boom"))
      expect(odds).toEqual(Either.left("boom"))
    })

    it("backpressure", async () => {
      const program = Effect.scoped(
        Stream.range(0, 6)
          .partitionEither(
            (i) =>
              i % 2 === 0
                ? Effect.succeedNow(Either.left(i))
                : Effect.succeedNow(Either.right(i)),
            1
          )
          .flatMap(({ tuple: [evens, odds] }) =>
            Effect.Do()
              .bind("ref", () => Ref.make(List.empty<number>()))
              .bind("latch", () => Promise.make<never, void>())
              .bind("fiber", ({ latch, ref }) =>
                evens
                  .tap(
                    (i) =>
                      ref.update((list) => list.prepend(i)) >
                      Effect.when(i === 2, latch.succeed(undefined))
                  )
                  .runDrain()
                  .fork()
              )
              .tap(({ latch }) => latch.await())
              .bind("snapshot1", ({ ref }) => ref.get())
              .bind("other", () => odds.runCollect())
              .tap(({ fiber }) => fiber.await())
              .bind("snapshot2", ({ ref }) => ref.get())
          )
      )

      const { other, snapshot1, snapshot2 } = await program.unsafeRunPromise()

      expect(snapshot1.toArray()).toEqual([2, 0])
      expect(snapshot2.toArray()).toEqual([4, 2, 0])
      expect(other.toArray()).toEqual([1, 3, 5])
    })
  })
})
