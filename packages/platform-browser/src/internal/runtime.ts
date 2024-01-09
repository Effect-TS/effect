import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"

/** @internal */
export const runMain = <E, A>(
  effect: Effect.Effect<never, E, A>
) => {
  const fiber = Effect.runFork(
    Effect.tapErrorCause(effect, (cause) => {
      if (Cause.isInterruptedOnly(cause)) {
        return Effect.unit
      }
      return Effect.logError(cause)
    })
  )

  addEventListener("beforeunload", () => {
    Effect.runFork(fiber.interruptAsFork(fiber.id()))
  })
}
