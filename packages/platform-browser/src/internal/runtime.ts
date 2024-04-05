import type { RunMain } from "@effect/platform/Runtime"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import * as HashSet from "effect/HashSet"
import * as Logger from "effect/Logger"

/** @internal */
const useStructuredLogger = Effect.locallyWith(FiberRef.currentLoggers, (loggers) => {
  if (HashSet.has(loggers, Logger.defaultLogger)) {
    const set = HashSet.remove(loggers, Logger.defaultLogger)
    return HashSet.add(set, Logger.withConsoleLog(Logger.structuredLogger))
  }

  return loggers
})

/** @internal */
export const runMain: RunMain = (
  effect,
  options
) => {
  const _effect = useStructuredLogger(effect)

  const fiber = Effect.runFork(
    options?.disableErrorReporting === true ?
      _effect :
      Effect.tapErrorCause(_effect, (cause) => {
        if (Cause.isInterruptedOnly(cause)) {
          return Effect.void
        }
        return Effect.logError(cause)
      })
  )

  addEventListener("beforeunload", () => {
    fiber.unsafeInterruptAsFork(fiber.id())
  })
}
