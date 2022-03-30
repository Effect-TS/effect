import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"

describe("Effect", () => {
  describe("flatten", () => {
    it("fluent/static method consistency", async () => {
      const effect = Effect.succeed(Effect.succeed("test"))
      const program = Effect.Do()
        .bind("flatten1", () => effect.flatten())
        .bind("flatten2", () => Effect.flatten(effect))

      const { flatten1, flatten2 } = await program.unsafeRunPromise()

      expect(flatten1).toEqual("test")
      expect(flatten2).toEqual("test")
    })
  })

  describe("flattenErrorOption", () => {
    it("fails when given Some error", async () => {
      const program = Effect.fail(Option.some("error")).flattenErrorOption("default")

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error"))
    })

    it("fails with default when given None error", async () => {
      const program = Effect.fail(Option.none).flattenErrorOption("default")

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("default"))
    })

    it("succeeds when given a value", async () => {
      const program = Effect.succeed(1).flattenErrorOption("default")

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })
})
