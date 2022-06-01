import { NumberService } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("serviceWith", () => {
    it("effectfully accesses a service in the environment", async () => {
      const program = Effect.serviceWithEffect(NumberService, ({ n }) => Effect.succeed(n + 3))
        .provideEnvironment(Env(NumberService, { n: 0 }))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 3)
    })
  })

  describe.concurrent("updateService", () => {
    it("updates a service in the environment", async () => {
      const program = Effect.Do()
        .bind("a", () => Effect.service(NumberService).updateService(NumberService, ({ n }) => ({ n: n + 1 })))
        .bind("b", () => Effect.service(NumberService))
        .provideEnvironment(Env(NumberService, { n: 0 }))

      const { a, b } = await program.unsafeRunPromise()

      assert.strictEqual(a.n, 1)
      assert.strictEqual(b.n, 0)
    })
  })
})
