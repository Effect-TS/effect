import { Effect } from "../../../src/io/Effect"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("forEachWhile", () => {
    it("handles leftovers", async () => {
      const program = Stream.range(1, 6).run(
        Sink.forEachWhile((n: number) => Effect.succeed(n <= 3)).exposeLeftover()
      )

      const result = await program.unsafeRunPromise()

      expect(result.get(1).toArray()).toEqual([4, 5])
    })
  })
})
