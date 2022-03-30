import { Cause } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"

describe("Effect", () => {
  describe("unsandbox", () => {
    it("unwraps exception", async () => {
      const failure = Effect.fail(Cause.fail(new Error("fail")))
      const success = Effect.succeed(100)
      const program = Effect.Do()
        .bind("message", () =>
          failure.unsandbox().foldEffect(
            (e) => Effect.succeed(e.message),
            () => Effect.succeed("unexpected")
          )
        )
        .bind("result", () => success.unsandbox())

      const { message, result } = await program.unsafeRunPromise()

      expect(message).toBe("fail")
      expect(result).toBe(100)
    })

    it("no information is lost during composition", async () => {
      function cause<R, E>(effect: Effect<R, E, never>): Effect<R, never, Cause<E>> {
        return effect.foldCauseEffect(Effect.succeedNow, Effect.failNow)
      }
      const c = Cause.fail("oh no")
      const program = cause(
        Effect.failCause(c)
          .sandbox()
          .mapErrorCause((e) => e.untraced())
          .unsandbox()
      )

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(c)
    })
  })
})
