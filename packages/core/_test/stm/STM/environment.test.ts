import { HasSTMEnv, STMEnv } from "@effect-ts/core/test/stm/STM/test-utils";

describe.concurrent("STM", () => {
  describe.concurrent("STM environment", () => {
    it("access environment and provide it outside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(HasSTMEnv)((_) => _.ref.update((n) => n + 1))
            .commit()
            .provideEnvironment(HasSTMEnv(env))
        )
        .flatMap((env) => env.ref.get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1);
    });

    it("access environment and provide it inside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(HasSTMEnv)((_) => _.ref.update((n) => n + 1))
            .provideEnvironment(HasSTMEnv(env))
            .commit()
        )
        .flatMap((env) => env.ref.get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1);
    });
  });
});
