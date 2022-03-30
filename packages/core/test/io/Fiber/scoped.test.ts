import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { withLatch } from "../../test-utils/Latch"

describe("Fiber", () => {
  describe("Create a new Fiber and:", () => {
    it("scope it", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<boolean>(false))
        .bind("fiber", ({ ref }) =>
          withLatch((release) =>
            Effect.acquireReleaseWithDiscard(
              release > Effect.unit,
              Effect.never,
              ref.set(true)
            ).fork()
          )
        )
        .tap(({ fiber }) => Effect.scoped(fiber.scoped()))
        .tap(({ fiber }) => fiber.await())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
