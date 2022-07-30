/**
 * Logs the specified message at the current log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops log
 */
export function log(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.log(message))
}

/**
 * Logs the specified message at the debug log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logDebug
 */
export function logDebug(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logDebug(message))
}

/**
 * Logs the specified message at the error log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logError
 */
export function logError(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logError(message))
}

/**
 * Logs the specified cause as an error.
 *
 * @tsplus static effect/core/stream/Stream.Ops logErrorCause
 */
export function logErrorCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logErrorCause(cause))
}

/**
 * Logs the specified message at the fatal log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logFatal
 */
export function logFatal(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logFatal(message))
}

/**
 * Logs the specified message at the informational log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logInfo
 */
export function logInfo(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logInfo(message))
}

/**
 * Logs the specified message at the warning log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logWarning
 */
export function logWarning(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logWarning(message))
}

/**
 * Logs the specified message at the trace log level.
 *
 * @tsplus static effect/core/stream/Stream.Ops logTrace
 */
export function logTrace(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logTrace(message))
}

/**
 * Sets the log level for streams composed after this.
 *
 * @tsplus static effect/core/stream/Stream.Ops logLevel
 */
export function logLevel(
  level: LazyArg<LogLevel>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.scoped(FiberRef.currentLogLevel.locallyScoped(level()))
}

/**
 * Adjusts the label for the logging span for streams composed after this.
 *
 * @tsplus static effect/core/stream/Stream.Ops logSpan
 */
export function logSpan(
  label: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.scoped(
    FiberRef.currentLogSpan.get.flatMap((stack) => {
      const now = Date.now()
      const logSpan = LogSpan(label(), now)
      return FiberRef.currentLogSpan.locallyScoped(stack.prepend(logSpan))
    })
  )
}
