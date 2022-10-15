import { STMEnv } from "@effect/core/test/stm/STM/test-utils"

describe.concurrent("STM", () => {
  describe.concurrent("STM environment", () => {
    it("access environment and provide it outside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(STMEnv.Tag)((_) => _.ref.update((n) => n + 1))
            .provideEnvironment(Env(STMEnv.Tag, env))
        )
        .flatMap((env) => env.ref.get)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })

    it("access environment and provide it inside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(STMEnv.Tag)((_) => _.ref.update((n) => n + 1))
            .provideEnvironment(Env(STMEnv.Tag, env))
        )
        .flatMap((env) => env.ref.get)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })

  describe.concurrent("taps", () => {
    it("tap should apply the transactional function to the effect result while keeping the effect itself", async () => {
      const program = STM.Do()
        .bind("refA", () => TRef.make(10))
        .bind("refB", () => TRef.make(0))
        .bind("a", ({ refA, refB }) => refA.get.tap((n) => refB.set(n + 1)))
        .bind("b", ({ refB }) => refB.get)

      const { a, b } = await program.unsafeRunPromise()

      assert.strictEqual(a, 10)
      assert.strictEqual(b, 11)
    })

    it("tapBoth applies the success function to success values while keeping the effect intact", async () => {
      const tx = Do(($) => {
        const tapSuccess = $(TDeferred.make<never, number>())
        const tapError = $(TDeferred.make<never, string>())
        const succeededSTM: STM<never, string, number> = STM.succeed(42)
        const result = $(succeededSTM.tapBoth(e => tapError.succeed(e), a => tapSuccess.succeed(a)))
        const tappedSuccess = $(tapSuccess.await)

        return result === 42 && tappedSuccess === 42
      })

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("tapBoth applies the function to error and successful values while keeping the effect itself on error", async () => {
      const tx = Do(($) => {
        const tapSuccess = $(TDeferred.make<never, number>())
        const tapError = $(TDeferred.make<never, string>())
        const succeededSTM: STM<never, string, number> = STM.failSync("error")
        const result = $(
          succeededSTM.tapBoth(e => tapError.succeed(e), a => tapSuccess.succeed(a)).either
        )
        const tappedError = $(tapError.await)

        return result == Either.left("error") && tappedError === "error"
      })

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })

    // it("tapError should apply the transactional function to the error result while keeping the effect itself", async () => {
    //   const tx = Do(($) => {
    //     const errorRef = $(TDeferred.make<never, string>())
    //     const failedStm = STM.failSync("error") > STM.succeed(0)
    //     const result = $(failedStm.tapError((e) => errorRef.succeed(e).either))
    //     const tappedError = $(errorRef.await)

    //     return result == Either.left("error") && tappedError === "error"
    //   })

    //   const result = await tx.unsafeRunPromise()

    //   assert.isTrue(result)
    // })
  })
})
