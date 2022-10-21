import { defaultLogger } from "@effect/core/io/Logger/operations/default"

/**
 * @tsplus static effect/core/io/Logger.Ops console
 */
export const consoleLogger: Logger<string, void> = defaultLogger.map((message) => {
  console.log(message)
})

/**
 * @tsplus static effect/core/io/Logger.Ops consoleLoggerLayer
 */
export const consoleLoggerLayer = Layer.scopedDiscard(
  FiberRef.currentLoggers.locallyScopedWith((loggers) => loggers.add(consoleLogger))
)

/**
 * @tsplus static effect/core/io/Logger.Ops withConsoleLogger
 */
export const withConsoleLogger = FiberRef.currentLoggers.locallyWith((loggers) =>
  loggers.add(consoleLogger)
)
