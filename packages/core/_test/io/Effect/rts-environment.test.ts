import { NumberService } from "@effect/core/test/io/Effect/test-utils";

describe.concurrent("Effect", () => {
  describe.concurrent("RTS environment", () => {
    it("provide is modular", async () => {
      const program = Effect.Do()
        .bind("v1", () => Effect.service(NumberService))
        .bind("v2", () => Effect.service(NumberService).provideEnvironment(Env(NumberService, { n: 2 })))
        .bind("v3", () => Effect.service(NumberService))
        .provideEnvironment(Env(NumberService, { n: 4 }));

      const { v1, v2, v3 } = await program.unsafeRunPromise();

      assert.strictEqual(v1.n, 4);
      assert.strictEqual(v2.n, 2);
      assert.strictEqual(v3.n, 4);
    });

    it("async can use environment", async () => {
      const program = Effect.async<Has<NumberService>, never, number>((cb) =>
        cb(Effect.service(NumberService).map(({ n }) => n))
      ).provideEnvironment(Env(NumberService, { n: 10 }));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10);
    });
  });
});
