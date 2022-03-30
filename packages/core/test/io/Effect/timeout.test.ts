import { Duration } from "../../../src/data/Duration"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { FiberId } from "../../../src/io/FiberId"
import { Promise } from "../../../src/io/Promise"

describe("Effect", () => {
  describe("timeout disconnect", () => {
    it("returns `Some` with the produced value if the effect completes before the timeout elapses", async () => {
      const program = Effect.unit.disconnect().timeout(Duration(100))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(undefined))
    })

    // FIXED: converted Effect.never.uninterruptible to Promise.await to avoid
    // leaking a Fiber
    it("returns `None` otherwise", async () => {
      const promise = Promise.unsafeMake<never, void>(FiberId.none)
      const program = promise
        .await()
        .uninterruptible()
        .disconnect()
        .timeout(Duration(10))
        .fork()
        .tap(() => Effect.sleep(Duration(100)))
        .flatMap((fiber) => fiber.join())

      const result = await program.unsafeRunPromise()
      await promise.succeed(void 0).unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })
})
