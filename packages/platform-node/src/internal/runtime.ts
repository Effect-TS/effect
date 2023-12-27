import { defaultTeardown, interruptAll, type RunMain } from "@effect/platform/Runtime"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"

/** @internal */
export const runMain: RunMain = <E, A>(
  effect: Effect.Effect<never, E, A>,
  teardown = defaultTeardown
) => {
  const fiber = Effect.runFork(
    Effect.tapErrorCause(effect, (cause) => {
      if (Cause.isInterruptedOnly(cause)) {
        return Effect.unit
      }
      return Effect.logError(cause)
    })
  )

  fiber.addObserver((exit) =>
    teardown(exit, (code) => {
      Effect.runCallback(interruptAll(fiber.id()), () => {
        process.exit(code)
      })
    })
  )

  function onSigint() {
    process.removeListener("SIGINT", onSigint)
    process.removeListener("SIGTERM", onSigint)
    Effect.runFork(fiber.interruptAsFork(fiber.id()))
  }

  process.once("SIGINT", onSigint)
  process.once("SIGTERM", onSigint)
}
