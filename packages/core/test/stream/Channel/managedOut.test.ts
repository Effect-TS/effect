import { Exit } from "../../../src/io/Exit"
import { Managed } from "../../../src/io/Managed"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("managedOut", () => {
    it("failure", async () => {
      const program = Channel.managedOut(Managed.fail("error")).runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error"))
    })
  })
})
