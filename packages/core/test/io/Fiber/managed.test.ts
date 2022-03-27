import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { withLatch } from "../../test-utils/Latch"

describe("Fiber", () => {
  describe("Create a new Fiber and:", () => {
    it("lift it into Managed", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<boolean>(false))
        .bind("fiber", ({ ref }) =>
          withLatch((release) =>
            (release > Effect.unit).acquireRelease(Effect.never, ref.set(true)).fork()
          )
        )
        .tap(({ fiber }) => fiber.toManaged().use(() => Effect.unit))
        .tap(({ fiber }) => fiber.await())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
