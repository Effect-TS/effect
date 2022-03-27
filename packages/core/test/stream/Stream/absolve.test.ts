import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("Combinators", () => {
    describe("absolve", () => {
      it("happy path", async () => {
        const program = Stream.fromIterable(Chunk(1, 2, 3).map(Either.right))
          .absolve()
          .runCollect()
          .map((chunk) => chunk.toArray())

        const result = await program.unsafeRunPromise()

        expect(result).toEqual([1, 2, 3])
      })

      it("failure", async () => {
        const program = Stream.fromIterable(
          Chunk(1, 2, 3).map(Either.right) + Chunk(Either.left("ouch"))
        )
          .absolve()
          .runCollect()
          .map((chunk) => chunk.toArray())

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail("ouch"))
      })

      it("round trip #1", async () => {
        const xss = Stream.fromIterable(Chunk(1, 2, 3).map(Either.right))
        const stream = xss + Stream(Either.left(4)) + xss
        const program = Effect.Do()
          .bind("res1", () => stream.runCollect())
          .bind("res2", () => stream.absolve().either().runCollect())

        const { res1, res2 } = await program.unsafeRunPromise()

        expect(res1.toArray().slice(0, res2.length)).toEqual(res2.toArray())
      })

      it("round trip #2", async () => {
        const xss = Stream.fromIterable(Chunk(1, 2, 3))
        const stream = xss + Stream.fail("ouch")
        const program = Effect.Do()
          .bind("res1", () => stream.runCollect().exit())
          .bind("res2", () => stream.either().absolve().runCollect().exit())

        const { res1, res2 } = await program.unsafeRunPromise()

        expect(res1.untraced()).toEqual(Exit.fail("ouch"))
        expect(res2.untraced()).toEqual(Exit.fail("ouch"))
      })
    })
  })
})
