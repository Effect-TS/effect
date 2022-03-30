import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"

const ExampleError = new Error("Oh noes!")

describe("Effect", () => {
  describe("ignore", () => {
    it("return success as unit", async () => {
      const program = Effect.succeed(11).ignore()

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("return failure as unit", async () => {
      const program = Effect.fail(123).ignore()

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("not catch throwable", async () => {
      const program = Effect.die(ExampleError).ignore()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })
  })
})
