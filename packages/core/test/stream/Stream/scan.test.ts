import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("scan", () => {
    it("simple example", async () => {
      const program = Stream(1, 2, 3, 4, 5)
        .scan(0, (s, a) => s + a)
        .runCollect()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([0, 1, 3, 6, 10, 15])
    })
  })

  describe("scanReduce", () => {
    it("simple example", async () => {
      const program = Stream(1, 2, 3, 4, 5)
        .scanReduce((s, a) => s + a)
        .runCollect()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 3, 6, 10, 15])
    })
  })
})
