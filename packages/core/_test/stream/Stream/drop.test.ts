import { Either } from "../../../src/data/Either"
import { constTrue } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("drop", () => {
    it("drop", async () => {
      const n = 2
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .drop(n)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) => chunk.drop(n).toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("doesn't swallow errors", async () => {
      const program = (Stream.fail("ouch") + Stream(1)).drop(1).runDrain().either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })
  })

  describe("dropRight", () => {
    it("simple example", async () => {
      const n = 2
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .dropRight(n)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) => chunk.dropRight(n).toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("doesn't swallow errors", async () => {
      const program = (Stream(1) + Stream.fail("ouch")).dropRight(1).runDrain().either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })
  })

  describe("dropUntil", () => {
    it("simple example", async () => {
      const p = (n: number) => n >= 3
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .dropUntil(p)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) =>
          chunk
            .dropWhile((n) => !p(n))
            .drop(1)
            .toArray()
        )
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })
  })

  describe("dropWhile", () => {
    it("dropWhile", async () => {
      const p = (n: number) => n >= 3
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .dropWhile(p)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) => chunk.dropWhile(p).toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("short circuits", async () => {
      const program = (Stream(1) + Stream.fail("ouch"))
        .take(1)
        .dropWhile(constTrue)
        .runDrain()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(undefined))
    })
  })
})
