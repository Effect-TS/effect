import { ExampleError } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("ignore", () => {
    it("return success as unit", async () => {
      const program = Effect.sync(11).ignore

      const result = await program.unsafeRunPromise()

      assert.isUndefined(result)
    })

    it("return failure as unit", async () => {
      const program = Effect.failSync(123).ignore

      const result = await program.unsafeRunPromise()

      assert.isUndefined(result)
    })

    it("not catch throwable", async () => {
      const program = Effect.die(ExampleError).ignore

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.die(ExampleError))
    })
  })
})
