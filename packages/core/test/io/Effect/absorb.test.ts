import { identity } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"

const ExampleError = new Error("Oh noes!")

const ExampleErrorFail = Effect.fail(ExampleError)
const ExampleErrorDie = Effect.die(() => {
  throw ExampleError
})

describe("Effect", () => {
  describe("absorbWith", () => {
    it("on fail", async () => {
      const program = ExampleErrorFail.absorbWith(identity)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("on die", async () => {
      const program = ExampleErrorDie.absorbWith(identity)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("on success", async () => {
      const program = Effect.succeed(1).absorbWith(() => ExampleError)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })
})
