import * as Runtime from "@effect/platform/Runtime"
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

  fiber.addObserver(() => {
    Effect.runFork(Runtime.interruptAll(fiber.id()))
  })

  addEventListener("beforeunload", () => {
    Effect.runFork(fiber.interruptAsFork(fiber.id()))
  })
}
