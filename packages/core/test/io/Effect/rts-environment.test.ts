import { NumberService } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("RTS environment", () => {
    it("provide is modular", () =>
      Do(($) => {
        const v1 = $(Effect.service(NumberService))
        const v2 = $(Effect.service(NumberService).provideEnvironment(Env(NumberService, { n: 2 })))
        const v3 = $(Effect.service(NumberService))
        assert.strictEqual(v1.n, 4)
        assert.strictEqual(v2.n, 2)
        assert.strictEqual(v3.n, 4)
      }).provideEnvironment(Env(NumberService, { n: 4 })).unsafeRunPromise())

    it("async can use environment", () =>
      Do(($) => {
        const result = $(
          Effect.async<NumberService, never, number>((cb) =>
            cb(Effect.service(NumberService).map(({ n }) => n))
          ).provideEnvironment(Env(NumberService, { n: 10 }))
        )
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())
  })
})
