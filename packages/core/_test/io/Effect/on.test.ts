import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("onExit", () => {
    it("executes that a cleanup function runs when effect succeeds", async () => {
      const program = Ref.make(false)
        .tap((ref) =>
          Effect.unit.onExit((exit) =>
            exit.fold(
              () => Effect.unit,
              () => ref.set(true)
            )
          )
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("ensures that a cleanup function runs when an effect fails", async () => {
      const program = Ref.make(false)
        .tap((ref) =>
          Effect.die(new RuntimeError())
            .onExit((exit) =>
              exit._tag === "Failure" && exit.cause.isDie
                ? ref.set(true)
                : Effect.unit
            )
            .sandbox
            .ignore
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("ensures that a cleanup function runs when an effect is interrupted", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Deferred.make<never, void>())
        .bind("latch2", () => Deferred.make<never, void>())
        .bind("fiber", ({ latch1, latch2 }) =>
          (latch1.succeed(undefined) > Effect.never)
            .onExit((exit) =>
              exit.isFailure() && exit.cause.isInterrupted
                ? latch2.succeed(undefined)
                : Effect.unit
            )
            .fork)
        .tap(({ latch1 }) => latch1.await)
        .tap(({ fiber }) => fiber.interrupt)
        .tap(({ latch2 }) => latch2.await)
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
