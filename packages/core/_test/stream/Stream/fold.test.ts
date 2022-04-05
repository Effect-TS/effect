import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("runFoldWhile", () => {
    it("should continue running while the predicate holds true", async () => {
      const program = Stream(1, 1, 1, 1, 1).runFoldWhile(
        0,
        (n) => n < 3,
        (a, b) => a + b
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(3)
    })
  })
})
