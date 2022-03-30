import { Promise } from "../../../src/io/Promise"

describe("Promise", () => {
  describe("interrupt", () => {
    it("interrupt a promise", async () => {
      const program = Promise.make<string, number>().flatMap((promise) =>
        promise.interrupt()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
