import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("fork", () => {
    it("propagates interruption", async () => {
      const program = Effect.never.fork.flatMap((fiber) => fiber.interrupt)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isInterrupted)
    })

    it("propagates interruption with zip of defect", async () => {
      const program = Effect.Do()
        .bind("latch", () => Deferred.make<never, void>())
        .bind("fiber", ({ latch }) =>
          (latch.succeed(undefined) > Effect.die(new Error()))
            .zipPar(Effect.never)
            .fork)
        .tap(({ latch }) => latch.await)
        .flatMap(({ fiber }) =>
          fiber
            .interrupt
            .map((exit) => exit.mapErrorCause((cause) => cause.untraced))
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isInterrupted)
    })
  })

  describe.concurrent("forkWithErrorHandler", () => {
    it("calls provided function when task fails", async () => {
      const program = Deferred.make<never, void>()
        .tap((deferred) => Effect.failSync(undefined).forkWithErrorHandler((e) => deferred.succeed(e).unit))
        .flatMap((deferred) => deferred.await)
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })

  describe.concurrent("head", () => {
    it("on non empty list", async () => {
      const program = Effect.sync(List(1, 2, 3)).head.either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.right(1))
    })

    it("on empty list", async () => {
      const program = Effect.sync(List.empty<number>()).head.either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(Maybe.none))
    })

    it("on failure", async () => {
      const program = Effect.failSync("fail").head.either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(Maybe.some("fail")))
    })
  })
})
