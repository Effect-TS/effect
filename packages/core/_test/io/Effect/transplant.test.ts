import { constTrue, constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("transplant", () => {
    it("preserves supervision relationship of nested fibers", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Deferred.make<never, void>())
        .bind("latch2", () => Deferred.make<never, void>())
        .bind("fiber", ({ latch1, latch2 }) =>
          Effect.transplant((grafter) =>
            grafter(
              (latch1.succeed(undefined) > Effect.never)
                .onInterrupt(() => latch2.succeed(undefined))
                .fork
                .flatMap(() => Effect.never)
                .map(constVoid)
                .fork
            )
          ))
        .tap(({ latch1 }) => latch1.await)
        .tap(({ fiber }) => fiber.interrupt)
        .tap(({ latch2 }) => latch2.await)
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
