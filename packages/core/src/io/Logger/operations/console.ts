import { defaultLogger } from "@effect/core/io/Logger/operations/default"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * @tsplus static effect/core/io/Logger.Ops console
 * @category constructors
 * @since 1.0.0
 */
export const consoleLogger: Logger<string, void> = defaultLogger.map((message) => {
  console.log(message)
})

/**
 * @tsplus static effect/core/io/Logger.Ops consoleLoggerLayer
 * @category layers
 * @since 1.0.0
 */
export const consoleLoggerLayer = Layer.scopedDiscard(
  FiberRef.currentLoggers.locallyScopedWith(HashSet.add(consoleLogger))
)

/**
 * @tsplus static effect/core/io/Logger.Ops withConsoleLogger
 * @category aspects
 * @since 1.0.0
 */
export const withConsoleLogger = FiberRef.currentLoggers.locallyWith(HashSet.add(consoleLogger))
