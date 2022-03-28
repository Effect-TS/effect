import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("mapOut", () => {
    it("simple", async () => {
      const program = Channel.writeAll(1, 2, 3)
        .mapOut((n) => n + 1)
        .runCollect()

      const {
        tuple: [chunk, z]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual([2, 3, 4])
      expect(z).toBeUndefined()
    })

    it("mixed with flatMap", async () => {
      const program = Channel.write(1)
        .mapOut((n) => n.toString())
        .flatMap(() => Channel.write("x"))
        .runCollect()
        .map((tuple) => tuple.get(0).toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(["1", "x"])
    })
  })
})
