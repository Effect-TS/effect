import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("map", () => {
    it("map", async () => {
      const program = Channel.succeed(1)
        .map((n) => n + 1)
        .runCollect()

      const {
        tuple: [chunk, z]
      } = await program.unsafeRunPromise()

      expect(chunk.isEmpty()).toBe(true)
      expect(z).toBe(2)
    })
  })
})
