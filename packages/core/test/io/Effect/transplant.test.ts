import { constTrue, constVoid } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"

describe("Effect", () => {
  describe("transplant", () => {
    it("preserves supervision relationship of nested fibers", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("fiber", ({ latch1, latch2 }) =>
          Effect.transplant((grafter) =>
            grafter(
              (latch1.succeed(undefined) > Effect.never)
                .onInterrupt(() => latch2.succeed(undefined))
                .fork()
                .flatMap(() => Effect.never)
                .map(constVoid)
                .fork()
            )
          )
        )
        .tap(({ latch1 }) => latch1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ latch2 }) => latch2.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
