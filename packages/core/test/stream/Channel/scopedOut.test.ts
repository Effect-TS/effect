import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("scopedOut", () => {
    it("failure", async () => {
      const program = Channel.scopedOut(Effect.fail("error")).runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error"))
    })
  })
})
