import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Logs the specified message at the current log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops log
 * @category logging
 * @since 1.0.0
 */
export function log(message: string): Stream<never, never, void> {
  return Stream.fromEffect(Effect.log(message))
}

/**
 * Logs the specified message at the debug log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logDebug
 * @category logging
 * @since 1.0.0
 */
export function logDebug(message: string): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logDebug(message))
}

/**
 * Logs the specified message at the error log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logError
 * @category logging
 * @since 1.0.0
 */
export function logError(message: string): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logError(message))
}

/**
 * Logs the specified cause as an error.
 *
 * @tsplus static effect/core/stream/Stream.Ops logErrorCause
 * @category logging
 * @since 1.0.0
 */
export function logErrorCause<E>(cause: Cause<E>): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logErrorCause(cause))
}

/**
 * Logs the specified message at the fatal log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logFatal
 * @category logging
 * @since 1.0.0
 */
export function logFatal(message: string): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logFatal(message))
}

/**
 * Logs the specified message at the informational log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logInfo
 * @category logging
 * @since 1.0.0
 */
export function logInfo(message: string): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logInfo(message))
}

/**
 * Logs the specified message at the warning log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logWarning
 * @category logging
 * @since 1.0.0
 */
export function logWarning(message: string): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logWarning(message))
}

/**
 * Logs the specified message at the trace log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logTrace
 * @category logging
 * @since 1.0.0
 */
export function logTrace(message: string): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logTrace(message))
}

/**
 * Sets the log level for streams composed after this.
 *
 * @tsplus static effect/core/stream/Stream.Ops logLevel
 * @category logging
 * @since 1.0.0
 */
export function logLevel(level: LogLevel): Stream<never, never, void> {
  return Stream.scoped(FiberRef.currentLogLevel.locallyScoped(level))
}

/**
 * Adjusts the label for the logging span for streams composed after this.
 *
 * @tsplus static effect/core/stream/Stream.Ops logSpan
 * @category logging
 * @since 1.0.0
 */
export function logSpan(label: string): Stream<never, never, void> {
  return Stream.scoped(
    FiberRef.currentLogSpan.get.flatMap((stack) => {
      const now = Date.now()
      const logSpan = LogSpan(label, now)
      return FiberRef.currentLogSpan.locallyScoped(pipe(stack, List.prepend(logSpan)))
    })
  )
}
