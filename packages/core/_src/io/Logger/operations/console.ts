import { runtimeDebug } from "@effect/core/io/Debug"
import { defaultLogger } from "@effect/core/io/Logger/operations/default"

/**
 * @tsplus static effect/core/io/Logger.Ops consoleLogger
 */
export const consoleLogger: Logger<string, void> = defaultLogger.map((message) =>
  globalThis.console.log(message)
)

/**
 * @tsplus static effect/core/io/Logger.Ops layer
 */
export const layer = <B>(logger: Logger<string, B>) =>
  Layer.scopedDiscard(
    FiberRef.currentLoggers.locallyScopedWith((loggers) => loggers.add(logger))
  )

/**
 * @tsplus static effect/core/io/Logger.Ops console
 */
export const console = (minLevel: LogLevel = LogLevel.Info) => {
  const newMin = runtimeDebug.logLevelOverride ?
    runtimeDebug.logLevelOverride :
    minLevel

  return layer(consoleLogger.filterLogLevel((level) => level.greaterThanEqual(newMin)))
}
