import { Option } from "../../../src/data/Option"
import { IllegalArgumentException, RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"

describe("Effect", () => {
  describe("unrefine", () => {
    it("converts some fiber failures into errors", async () => {
      const message = "division by zero"
      const defect = Effect.die(new IllegalArgumentException(message))
      const program = defect.unrefine((u) =>
        u instanceof IllegalArgumentException ? Option.some(u.message) : Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(message))
    })

    it("leaves the rest", async () => {
      const error = new IllegalArgumentException("division by zero")
      const defect = Effect.die(error)
      const program = defect.unrefine((u) =>
        u instanceof RuntimeError ? Option.some(u.message) : Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })
  })

  describe("unrefineWith", () => {
    it("converts some fiber failures into errors", async () => {
      const message = "division by zero"
      const defect = Effect.die(new IllegalArgumentException(message))
      const program = defect.unrefineWith(
        (u) =>
          u instanceof IllegalArgumentException ? Option.some(u.message) : Option.none,
        () => Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(message))
    })

    it("leaves the rest", async () => {
      const error = new IllegalArgumentException("division by zero")
      const defect = Effect.die(error)
      const program = defect.unrefineWith(
        (u) => (u instanceof RuntimeError ? Option.some(u.message) : Option.none),
        () => Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("uses the specified function to convert the `E` into an `E1`", async () => {
      const failure = Effect.fail("fail")
      const program = failure.unrefineWith(
        (u) =>
          u instanceof IllegalArgumentException ? Option.some(u.message) : Option.none,
        () => Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.none))
    })
  })
})
