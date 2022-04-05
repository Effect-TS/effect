import { Either } from "../../../src/data/Either"
import { constTrue } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("filter", () => {
    it("simple example", async () => {
      const p = (n: number) => n % 2 === 0
      const stream = Stream(1, 2, 3, 4, 5, 6)
      const program = Effect.struct({
        actual: stream
          .filter(p)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) => chunk.filter(p).toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })
  })

  describe("filterEffect", () => {
    it("simple example", async () => {
      const p = (n: number) => Effect.succeed(n % 2 === 0)
      const stream = Stream(1, 2, 3, 4, 5, 6)
      const program = Effect.struct({
        actual: stream
          .filterEffect(p)
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream
          .runCollect()
          .flatMap((chunk) => chunk.filterEffect(p).map((chunk) => chunk.toArray()))
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3, 4)
        .filterEffect((n) =>
          n === 3 ? Effect.fail("boom") : Effect.succeed(constTrue)
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
})
