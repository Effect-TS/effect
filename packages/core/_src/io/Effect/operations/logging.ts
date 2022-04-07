import { ILogged } from "@effect/core/io/Effect/definition/primitives";

const someFatal = Option.some(LogLevel.Fatal);
const someError = Option.some(LogLevel.Error);
const someWarning = Option.some(LogLevel.Warning);
const someTrace = Option.some(LogLevel.Trace);
const someInfo = Option.some(LogLevel.Info);
const someDebug = Option.some(LogLevel.Debug);

/**
 * Logs the specified message at the current log level.
 *
 * @tsplus static ets/Effect/Ops log
 */
export function log(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, Option.none, null, null, __tsplusTrace);
}

/**
 * Logs the specified message at the debug log level.
 *
 * @tsplus static ets/Effect/Ops logDebug
 */
export function logDebug(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someDebug, null, null, __tsplusTrace);
}

/**
 * Logs the specified cause at the debug log level.
 *
 * @tsplus static ets/Effect/Ops logDebugCause
 */
export function logDebugCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someDebug, null, null, __tsplusTrace);
}

/**
 * Logs the specified message and cause at the debug log level.
 *
 * @tsplus static ets/Effect/Ops logDebugCauseMessage
 */
export function logDebugCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someDebug, null, null, __tsplusTrace);
}

/**
 * Logs the specified message at the error log level.
 *
 * @tsplus static ets/Effect/Ops logError
 */
export function logError(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someError, null, null, __tsplusTrace);
}

/**
 * Logs the specified cause at the error log level.
 *
 * @tsplus static ets/Effect/Ops logErrorCause
 */
export function logErrorCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someError, null, null, __tsplusTrace);
}

/**
 * Logs the specified message and cause at the error log level.
 *
 * @tsplus static ets/Effect/Ops logErrorCauseMessage
 */
export function logErrorCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someError, null, null, __tsplusTrace);
}

/**
 * Logs the specified message at the fatal log level.
 *
 * @tsplus static ets/Effect/Ops logFatal
 */
export function logFatal(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someFatal, null, null, __tsplusTrace);
}

/**
 * Logs the specified cause at the fatal log level.
 *
 * @tsplus static ets/Effect/Ops logFatalCause
 */
export function logFatalCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someFatal, null, null, __tsplusTrace);
}

/**
 * Logs the specified message and cause at the fatal log level.
 *
 * @tsplus static ets/Effect/Ops logFatalCauseMessage
 */
export function logFatalCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someFatal, null, null, __tsplusTrace);
}

/**
 * Logs the specified message at the informational log level.
 *
 * @tsplus static ets/Effect/Ops logInfo
 */
export function logInfo(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someInfo, null, null, __tsplusTrace);
}

/**
 * Logs the specified cause at the informational log level.
 *
 * @tsplus static ets/Effect/Ops logInfoCause
 */
export function logInfoCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someInfo, null, null, __tsplusTrace);
}

/**
 * Logs the specified message and cause at the informational log level.
 *
 * @tsplus static ets/Effect/Ops logInfoCauseMessage
 */
export function logInfoCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someInfo, null, null, __tsplusTrace);
}

/**
 * Logs the specified message at the warning log level.
 *
 * @tsplus static ets/Effect/Ops logWarning
 */
export function logWarning(
  message: LazyArg<string>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, () => Cause.empty, someWarning, null, null, __tsplusTrace);
}

/**
 * Logs the specified cause at the warning log level.
 *
 * @tsplus static ets/Effect/Ops logWarningCause
 */
export function logWarningCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someWarning, null, null, __tsplusTrace);
}

/**
 * Logs the specified message and cause at the warning log level.
 *
 * @tsplus static ets/Effect/Ops logWarningCauseMessage
 */
export function logWarningCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someWarning, null, null, __tsplusTrace);
}

/**
 * Logs the specified message at the trace log level.
 *
 * @tsplus static ets/Effect/Ops logTrace
 */
export function logTrace(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someTrace, null, null, __tsplusTrace);
}

/**
 * Logs the specified cause at the trace log level.
 *
 * @tsplus static ets/Effect/Ops logTraceCause
 */
export function logTraceCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someTrace, null, null, __tsplusTrace);
}

/**
 * Logs the specified message and cause at the trace log level.
 *
 * @tsplus static ets/Effect/Ops logTraceCauseMessage
 */
export function logTraceCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someTrace, null, null, __tsplusTrace);
}

/**
 * Adjusts the label for the current logging span.
 *
 * @tsplus static ets/Effect/Ops logSpan
 */
export function logSpan(label: LazyArg<string>) {
  return <R, E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    FiberRef.currentLogSpan.value.get().flatMap((stack) =>
      Effect.suspendSucceed(() => {
        const now = Date.now();
        const logSpan = LogSpan(label(), now);
        return effect.apply(
          FiberRef.currentLogSpan.value.locally(stack.prepend(logSpan))
        );
      })
    );
}

/**
 * Annotates each log in this effect with the specified log annotation.
 *
 * @tsplus static ets/Effect/Ops logAnnotate
 */
export function logAnnotate(key: LazyArg<string>, value: LazyArg<string>) {
  return <R, E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    FiberRef.currentLogAnnotations.value
      .get()
      .flatMap((annotations) =>
        Effect.suspendSucceed(() =>
          effect.apply(
            FiberRef.currentLogAnnotations.value.locally(
              annotations.set(key(), value())
            )
          )
        )
      );
}

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @tsplus static ets/Effect/Ops logAnnotations
 */
export function logAnnotations(__tsplusTrace?: string): UIO<Map<string, string>> {
  return FiberRef.currentLogAnnotations.value.get();
}

/**
 * An aspect that disables logging for the specified effect.
 *
 * @tsplus static ets/Effect/Ops disableLogging
 */
export function disableLogging<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
  return Effect.runtimeConfig.flatMap((runtimeConfig) =>
    Effect.withRuntimeConfig(
      RuntimeConfig({ ...runtimeConfig.value, logger: Logger.none }),
      effect
    )
  );
}
