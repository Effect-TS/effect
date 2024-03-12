import type { RunMain } from "@effect/platform/Runtime"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"

/** @internal */
export const runMain: RunMain = (
  effect,
  options
) => {
  const fiber = Effect.runFork(
    options?.disableErrorReporting === true ?
      effect :
      Effect.tapErrorCause(effect, (cause) => {
        if (Cause.isInterruptedOnly(cause)) {
          return Effect.unit
        }
        return Effect.logError(cause)
      })
  )

  addEventListener("beforeunload", () => {
    fiber.unsafeInterruptAsFork(fiber.id())
  })
}
