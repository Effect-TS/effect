import { Promise } from "../../../src/io/Promise"

describe("Promise", () => {
  describe("isDone", () => {
    it("when a promise is completed", async () => {
      const program = Promise.make<string, number>()
        .tap((promise) => promise.succeed(0))
        .flatMap((promise) => promise.isDone())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("when a promise is failed", async () => {
      const program = Promise.make<string, number>()
        .tap((promise) => promise.fail("failure"))
        .flatMap((promise) => promise.isDone())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
