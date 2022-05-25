import { STMEnv } from "@effect/core/test/stm/STM/test-utils"

describe.concurrent("STM", () => {
  describe.concurrent("STM environment", () => {
    it("access environment and provide it outside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(STMEnv.Tag)((_) => _.ref.update((n) => n + 1))
            .commit()
            .provideEnvironment(Env(STMEnv.Tag, env))
        )
        .flatMap((env) => env.ref.get().commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })

    it("access environment and provide it inside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(STMEnv.Tag)((_) => _.ref.update((n) => n + 1))
            .provideEnvironment(Env(STMEnv.Tag, env))
            .commit()
        )
        .flatMap((env) => env.ref.get().commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })
})
