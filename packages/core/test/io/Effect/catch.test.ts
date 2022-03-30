import { Option } from "../../../src/data/Option"
import { IllegalArgumentException, RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"

describe("Effect", () => {
  describe("catchNonFatalOrDie", () => {
    it("recovers from non-fatal", async () => {
      const message = "division by zero"
      const program = Effect.fail(
        new IllegalArgumentException(message)
      ).catchNonFatalOrDie((e) => Effect.succeed(e.message))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.succeed(message))
    })
  })

  describe("catchAllDefect", () => {
    it("recovers from all defects", async () => {
      const message = "division by zero"
      const program = Effect.die(new IllegalArgumentException(message)).catchAllDefect(
        (e) => Effect.succeed((e as Error).message)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(message)
    })

    it("leaves errors", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.fail(error).catchAllDefect((e) =>
        Effect.succeed((e as Error).message)
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(error))
    })

    it("leaves values", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.succeed(error).catchAllDefect((e) =>
        Effect.succeed((e as Error).message)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(error)
    })
  })

  describe("catchSomeDefect", () => {
    it("recovers from some defects", async () => {
      const message = "division by zero"
      const program = Effect.die(new IllegalArgumentException(message)).catchSomeDefect(
        (e) =>
          e instanceof IllegalArgumentException
            ? Option.some(Effect.succeed(e.message))
            : Option.none
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(message)
    })

    it("leaves the rest", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.die(error).catchSomeDefect((e) =>
        e instanceof RuntimeError ? Option.some(Effect.succeed(e.message)) : Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("leaves errors", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.fail(error).catchSomeDefect((e) =>
        e instanceof IllegalArgumentException
          ? Option.some(Effect.succeed(e.message))
          : Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(error))
    })

    it("leaves values", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.succeed(error).catchSomeDefect((e) =>
        e instanceof IllegalArgumentException
          ? Option.some(Effect.succeed(e.message))
          : Option.none
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(error)
    })
  })
})
