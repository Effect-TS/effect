import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"

describe("Promise", () => {
  describe("poll", () => {
    it("a promise that is not completed yet", async () => {
      const program = Promise.make<string, number>().flatMap((promise) =>
        promise.poll()
      )

      const result = await program.unsafeRunPromise()

      expect(result.isNone()).toBe(true)
    })

    it("a promise that is completed", async () => {
      const program = Promise.make<string, number>()
        .tap((promise) => promise.succeed(12))
        .flatMap((promise) =>
          promise
            .poll()
            .someOrFail(() => "fail")
            .flatten()
            .exit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Exit.succeed(12))
    })

    it("a promise that is failed", async () => {
      const program = Promise.make<string, number>()
        .tap((promise) => promise.fail("failure"))
        .flatMap((promise) =>
          promise
            .poll()
            .someOrFail(() => "fail")
            .flatten()
            .exit()
        )

      const result = await program.unsafeRunPromise()

      expect(result.isFailure()).toBe(true)
    })

    it("a promise that is interrupted", async () => {
      const program = Promise.make<string, number>()
        .tap((promise) => promise.interrupt())
        .flatMap((promise) =>
          promise
            .poll()
            .someOrFail(() => "fail")
            .flatten()
            .exit()
        )

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })
  })
})
