/**
 * Logs the specified message at the current log level.
 *
 * @tsplus static ets/Stream/Ops log
 */
export function log(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.log(message))
}

/**
 * Logs the specified message at the debug log level.
 */
export function logDebug(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logDebug(message))
}

/**
 * Logs the specified message at the error log level.
 */
export function logError(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logError(message))
}

/**
 * Logs the specified cause as an error.
 */
export function logErrorCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logErrorCause(cause))
}

/**
 * Logs the specified message at the fatal log level.
 */
export function logFatal(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logFatal(message))
}

/**
 * Logs the specified message at the informational log level.
 */
export function logInfo(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logInfo(message))
}

/**
 * Logs the specified message at the warning log level.
 */
export function logWarning(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logWarning(message))
}

/**
 * Logs the specified message at the trace log level.
 */
export function logTrace(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.fromEffect(Effect.logTrace(message))
}

/**
 * Sets the log level for streams composed after this.
 */
export function logLevel(
  level: LazyArg<LogLevel>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.scoped(FiberRef.currentLogLevel.value.locallyScoped(level()))
}

/**
 * Adjusts the label for the logging span for streams composed after this.
 */
export function logSpan(
  label: LazyArg<string>,
  __tsplusTrace?: string
): Stream<never, never, void> {
  return Stream.scoped(
    FiberRef.currentLogSpan.value.get().flatMap((stack) => {
      const now = Date.now()
      const logSpan = LogSpan(label(), now)
      return FiberRef.currentLogSpan.value.locallyScoped(stack.prepend(logSpan))
    })
  )
}
