import { Either } from "../../../src/data/Either"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("either", () => {
    it("should convert stream elements to Either", async () => {
      const program = (Stream(1, 2, 3) + Stream.fail("boom")).either().runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right(1),
        Either.right(2),
        Either.right(3),
        Either.left("boom")
      ])
    })
  })
})
