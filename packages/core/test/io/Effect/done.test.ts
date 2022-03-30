import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { FiberId } from "../../../src/io/FiberId"
import { TraceElement } from "../../../src/io/TraceElement"

const ExampleError = new Error("Oh noes!")

describe("Effect", () => {
  describe("done", () => {
    it("check that done lifts exit result into IO", async () => {
      const fiberId = FiberId(0, 123, TraceElement.empty)
      const error = ExampleError
      const program = Effect.Do()
        .bind("completed", () => Effect.done(Exit.succeed(1)))
        .bind("interrupted", () => Effect.done(Exit.interrupt(fiberId)).exit())
        .bind("terminated", () => Effect.done(Exit.die(error)).exit())
        .bind("failed", () => Effect.done(Exit.fail(error)).exit())

      const { completed, failed, interrupted, terminated } =
        await program.unsafeRunPromise()

      expect(completed).toBe(1)
      expect(interrupted.untraced()).toEqual(Exit.interrupt(fiberId))
      expect(terminated.untraced()).toEqual(Exit.die(error))
      expect(failed.untraced()).toEqual(Exit.fail(error))
    })
  })
})
