import { Either } from "../../../src/data/Either"
import { identity } from "../../../src/data/Function"
import { IllegalArgumentException } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"

describe("Effect", () => {
  describe("mapBoth", () => {
    it("maps over both error and value channels", async () => {
      const program = Effect.fail(10)
        .mapBoth((n) => n.toString(), identity)
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("10"))
    })
  })

  describe("mapTryCatch", () => {
    it("returns an effect whose success is mapped by the specified side effecting function", async () => {
      function parseInt(s: string): number {
        const n = Number.parseInt(s)
        if (Number.isNaN(n)) {
          throw new IllegalArgumentException()
        }
        return n
      }

      const program = Effect.succeed("123").mapTryCatch(parseInt, identity)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(123)
    })

    it("translates any thrown exceptions into typed failed effects", async () => {
      function parseInt(s: string): number {
        const n = Number.parseInt(s)
        if (Number.isNaN(n)) {
          throw new IllegalArgumentException()
        }
        return n
      }

      const program = Effect.succeed("hello").mapTryCatch(parseInt, identity)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(new IllegalArgumentException()))
    })
  })

  describe("negate", () => {
    it("on true returns false", async () => {
      const program = Effect.succeed(true).negate()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("on false returns true", async () => {
      const program = Effect.succeed(false).negate()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
