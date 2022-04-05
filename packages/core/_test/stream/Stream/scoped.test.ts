import { Either } from "../../../src/data/Either"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { InterruptStatus } from "../../../src/io/InterruptStatus"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("managed", () => {
    it("preserves failure of effect", async () => {
      const program = Stream.scoped(Effect.fail("error")).runCollect().either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("error"))
    })

    it("preserves interruptibility of effect", async () => {
      const program = Effect.struct({
        interruptible: Stream.scoped(
          Effect.suspendSucceed(Effect.checkInterruptible(Effect.succeedNow))
        ).runHead(),
        uninterruptible: Stream.scoped(
          Effect.checkInterruptible(Effect.succeedNow).uninterruptible()
        ).runHead()
      })

      const { interruptible, uninterruptible } = await program.unsafeRunPromise()

      expect(interruptible).toEqual(Option.some(InterruptStatus.Interruptible))
      expect(uninterruptible).toEqual(Option.some(InterruptStatus.Uninterruptible))
    })
  })
})
