import { Exit } from "../../../src/io/Exit"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  it("succeed", async () => {
    const program = Channel.succeed(1).runCollect()

    const {
      tuple: [chunk, z]
    } = await program.unsafeRunPromise()

    expect(chunk.isEmpty()).toBe(true)
    expect(z).toBe(1)
  })

  it("fail", async () => {
    const program = Channel.fail("uh oh").runCollect()

    const result = await program.unsafeRunPromiseExit()

    expect(result.untraced()).toEqual(Exit.fail("uh oh"))
  })
})
