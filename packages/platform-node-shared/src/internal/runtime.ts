import { defaultTeardown, type RunMain } from "@effect/platform/Runtime"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"

/** @internal */
export const runMain: RunMain = (
  effect,
  options
) => {
  const teardown = options?.teardown ?? defaultTeardown
  const keepAlive = setInterval(() => {}, 2 ** 31 - 1)

  const fiber = Effect.runFork(
    options?.disableErrorReporting === true ?
      effect :
      Effect.tapErrorCause(effect, (cause) => {
        if (Cause.isInterruptedOnly(cause)) {
          return Effect.void
        }
        return Effect.logError(cause)
      })
  )

  fiber.addObserver((exit) => {
    clearInterval(keepAlive)
    teardown(exit, (code) => {
      process.exit(code)
    })
  })

  function onSigint() {
    process.removeListener("SIGINT", onSigint)
    process.removeListener("SIGTERM", onSigint)
    fiber.unsafeInterruptAsFork(fiber.id())
  }

  process.once("SIGINT", onSigint)
  process.once("SIGTERM", onSigint)
}
