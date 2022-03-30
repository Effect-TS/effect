import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("iterate", () => {
    it("simple example", async () => {
      const program = Stream.iterate(1, (n) => n + 1)
        .take(10)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(Chunk.range(1, 10).toArray())
    })
  })

  describe("runForEach", () => {
    it("with small data set", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Stream(1, 1, 1, 1, 1).runForEach((n) => ref.update((m) => n + m))
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })

    it("with bigger data set", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Stream.fromIterable(List.repeat(1, 1000)).runForEach((n) =>
            ref.update((m) => n + m)
          )
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1000)
    })
  })

  describe("forEachWhile", () => {
    it("with small data set", async () => {
      const expected = 3
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Stream(1, 1, 1, 1, 1).runForEachWhile((a) =>
            ref.modify((sum) =>
              sum >= expected ? Tuple(false, sum) : Tuple(true, sum + a)
            )
          )
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(expected)
    })

    it("with bigger data set", async () => {
      const expected = 500
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Stream.fromIterable(List.repeat(1, 1000)).runForEachWhile((a) =>
            ref.modify((sum) =>
              sum >= expected ? Tuple(false, sum) : Tuple(true, sum + a)
            )
          )
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(expected)
    })

    it("short circuits", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(true))
        .tap(({ ref }) =>
          (
            Stream(true, true, false) + Stream.fromEffect(ref.set(false)).drain()
          ).runForEachWhile(Effect.succeedNow)
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
