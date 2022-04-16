/**
 * Logs the specified message at the current log level.
 *
 * @tsplus static ets/Sink/Ops log
 */
export function log(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, unknown, void> {
  return Sink.fromEffect(Effect.log(message));
}

/**
 * Logs the specified message at the debug log level.
 *
 * @tsplus static ets/Sink/Ops logDebug
 */
export function logDebug(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, unknown, void> {
  return Sink.fromEffect(Effect.logDebug(message));
}

/**
 * Logs the specified message at the error log level.
 *
 * @tsplus static ets/Sink/Ops logError
 */
export function logError(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, unknown, void> {
  return Sink.fromEffect(Effect.logError(message));
}

/**
 * Logs the specified message at the error log level.
 *
 * @tsplus static ets/Sink/Ops logErrorCause
 */
export function logErrorCause(
  cause: LazyArg<Cause<unknown>>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, unknown, void> {
  return Sink.fromEffect(Effect.logErrorCause(cause));
}

/**
 * Logs the specified message at the fatal log level.
 *
 * @tsplus static ets/Sink/Ops logFatal
 */
export function logFatal(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, unknown, void> {
  return Sink.fromEffect(Effect.logFatal(message));
}

/**
 * Logs the specified message at the info log level.
 *
 * @tsplus static ets/Sink/Ops logInfo
 */
export function logInfo(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, unknown, void> {
  return Sink.fromEffect(Effect.logInfo(message));
}

/**
 * Logs the specified message at the trace log level.
 *
 * @tsplus static ets/Sink/Ops logTrace
 */
export function logTrace(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, unknown, void> {
  return Sink.fromEffect(Effect.logTrace(message));
}

/**
 * Logs the specified message at the warning log level.
 *
 * @tsplus static ets/Sink/Ops logWarning
 */
export function logWarning(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, unknown, void> {
  return Sink.fromEffect(Effect.logWarning(message));
}

/**
 * Sets the log level for streams composed after this.
 *
 * @tsplus static ets/Sink/Ops logLevel
 */
export function logLevel(level: LogLevel) {
  return <R, E, In, L, Z>(
    sink: Sink<R, E, In, L, Z>,
    __tsplusTrace?: string
  ): Sink<R, E, In, L, Z> => Sink.unwrapScoped(FiberRef.currentLogLevel.value.locallyScoped(level).as(sink));
}

/**
 * Adjusts the label for the logging span for streams composed after this.
 *
 * @tsplus static ets/Sink/Ops logSpan
 */
export function logSpan(label: LazyArg<string>) {
  return <R, E, In, L, Z>(
    sink: Sink<R, E, In, L, Z>,
    __tsplusTrace?: string
  ): Sink<R, E, In, L, Z> =>
    Sink.unwrapScoped(
      FiberRef.currentLogSpan.value.get().flatMap((stack) => {
        const now = Date.now();
        const logSpan = LogSpan(label(), now);
        return FiberRef.currentLogSpan.value
          .locallyScoped(stack.prepend(logSpan))
          .as(sink);
      })
    );
}

/**
 * Annotates each log in streams composed after this with the specified log
 * annotation.
 *
 * @tsplus static ets/Sink/Ops logAnnotate
 */
export function logAnnotate(key: LazyArg<string>, value: LazyArg<string>) {
  return <R, E, In, L, Z>(
    sink: Sink<R, E, In, L, Z>,
    __tsplusTrace?: string
  ): Sink<R, E, In, L, Z> =>
    Sink.unwrapScoped(
      FiberRef.currentLogAnnotations.value
        .get()
        .flatMap((annotations) =>
          FiberRef.currentLogAnnotations.value
            .locallyScoped(annotations.set(key(), value()))
            .as(sink)
        )
    );
}

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @tsplus static ets/Sink/Ops logAnnotations
 */
export function logAnnotations(
  __tsplusTrace?: string
): Sink<unknown, never, unknown, unknown, ImmutableMap<string, string>> {
  return Sink.fromEffect(FiberRef.currentLogAnnotations.value.get());
}
