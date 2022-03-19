import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Exit } from "../../../src/io/Exit"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("flatMap", () => {
    it("simple", async () => {
      const program = Channel.Do()
        .bind("x", () => Channel.succeed(1))
        .bind("y", ({ x }) => Channel.succeed(x * 2))
        .bind("z", ({ x, y }) => Channel.succeed(x + y))
        .map(({ x, y, z }) => x + y + z)
        .runCollect()

      const {
        tuple: [chunk, z]
      } = await program.unsafeRunPromise()

      expect(chunk.isEmpty()).toBe(true)
      expect(z).toBe(6)
    })

    it("structure confusion", async () => {
      const program = Channel.write(Chunk(1, 2))
        .concatMap((chunk) => Channel.writeAll(chunk))
        .zipRight(Channel.fail("hello"))
        .runDrain()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("hello"))
    })
  })
})
