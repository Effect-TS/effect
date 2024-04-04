import type { RunMain } from "@effect/platform/Runtime"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Logger from "effect/Logger"
import * as Layer from "effect/Layer"
import * as HashSet from "effect/HashSet"
import * as FiberRef from "effect/FiberRef"

/** @internal */
const useStructuredLogger = Layer.fiberRefLocallyScopedWith(FiberRef.currentLoggers, (loggers) =>  {
  if(HashSet.has(loggers, Logger.defaultLogger)) {
    const set = HashSet.remove(loggers, Logger.defaultLogger);
    return HashSet.add(set, Logger.structuredLogger)
  }

  return loggers;
})


/** @internal */
export const runMain: RunMain = (
  effect,
  options
) => {
  const _effect = Effect.provide(effect, useStructuredLogger)
  
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
