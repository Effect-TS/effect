import { Exit } from "../../../src/io/Exit"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("catchAll", () => {
    it("structure confusion", async () => {
      const program = Channel.write(8)
        .catchAll(() => Channel.write(0).concatMap(() => Channel.fail("error1")))
        .concatMap(() => Channel.fail("error2"))
        .runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error2"))
    })
  })
})
