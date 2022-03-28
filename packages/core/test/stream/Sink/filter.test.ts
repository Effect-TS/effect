import { Effect } from "../../../src/io/Effect"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("filterInput", () => {
    it("should filter input values", async () => {
      const program = Stream.range(1, 10).run(
        Sink.collectAll<number>().filterInput((n) => n % 2 === 0)
      )

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([2, 4, 6, 8])
    })
  })

  describe("filterInputEffect", () => {
    it("happy path", async () => {
      const program = Stream.range(1, 10).run(
        Sink.collectAll<number>().filterInputEffect((n) => Effect.succeed(n % 2 === 0))
      )

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([2, 4, 6, 8])
    })

    it("failure", async () => {
      const program = Stream.range(1, 10)
        .run(
          Sink.collectAll<number>().filterInputEffect(
            () => Effect.fail("fail") as Effect<unknown, string, boolean>
          )
        )
        .flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual("fail")
    })
  })
})
