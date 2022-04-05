import { Exit } from "../../../src/io/Exit"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("mapError", () => {
    it("structure confusion", async () => {
      const program = Channel.fail("err")
        .mapError(() => 1)
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })
  })
})
