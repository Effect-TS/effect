import { ExampleError } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("ignore", () => {
    it("return success as unit", () =>
      Do(($) => {
        const result = $(Effect.sync(11).ignore)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("return failure as unit", () =>
      Do(($) => {
        const result = $(Effect.failSync(123).ignore)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("not catch throwable", () =>
      Do(($) => {
        const result = $(Effect.dieSync(ExampleError).ignore.exit)
        assert.isTrue(result == Exit.die(ExampleError))
      }).unsafeRunPromise())
  })
})
