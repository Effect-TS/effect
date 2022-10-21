import { NumberService } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("serviceWith", () => {
    it("effectfully accesses a service in the environment", () =>
      Do(($) => {
        const result = $(
          Effect
            .serviceWithEffect(NumberService, ({ n }) => Effect.sync(n + 3))
            .provideEnvironment(Env(NumberService, { n: 0 }))
        )
        assert.strictEqual(result, 3)
      }).unsafeRunPromise())
  })

  describe.concurrent("updateService", () => {
    it("updates a service in the environment", () =>
      Do(($) => {
        const a = $(
          Effect
            .service(NumberService)
            .updateService(NumberService, ({ n }) => ({ n: n + 1 }))
        )
        const b = $(Effect.service(NumberService))
        assert.strictEqual(a.n, 1)
        assert.strictEqual(b.n, 0)
      }).provideEnvironment(Env(NumberService, { n: 0 })).unsafeRunPromise())
  })
})
