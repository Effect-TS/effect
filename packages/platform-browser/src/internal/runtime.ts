import type { RunMain } from "@effect/platform/Runtime"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Logger from "effect/Logger"

/** @internal */
export const runMain: RunMain = (
  effect,
  options
) => {
  const _effect = Effect.provide(effect, Logger.structured)

  const fiber = Effect.runFork(
    options?.disableErrorReporting === true ?
      _effect :
      Effect.tapErrorCause(_effect, (cause) => {
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
