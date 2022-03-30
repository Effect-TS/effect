import { Effect } from "../../../src/io/Effect"
import { InterruptStatus } from "../../../src/io/InterruptStatus"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("RTS forking inheritability", () => {
    it("interruption status is heritable", async () => {
      const program = Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("ref", () => Ref.make(InterruptStatus.Interruptible))
        .tap(({ latch, ref }) =>
          (
            Effect.checkInterruptible(
              (interruptStatus) => ref.set(interruptStatus) > latch.succeed(undefined)
            ).fork() > latch.await()
          ).uninterruptible()
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(InterruptStatus.Uninterruptible)
    })
  })
})
