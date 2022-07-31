import { ILogged } from "@effect/core/io/Effect/definition/primitives"

const someFatal = Maybe.some(LogLevel.Fatal)
const someError = Maybe.some(LogLevel.Error)
const someWarning = Maybe.some(LogLevel.Warning)
const someTrace = Maybe.some(LogLevel.Trace)
const someInfo = Maybe.some(LogLevel.Info)
const someDebug = Maybe.some(LogLevel.Debug)

/**
 * Logs the specified message at the current log level.
 *
 * @tsplus static effect/core/io/Effect.Ops log
 */
export function log(message: LazyArg<string>): Effect<never, never, void> {
  return new ILogged(message, () => Cause.empty, Maybe.none, null, null)
}

/**
 * Logs the specified message at the debug log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logDebug
 */
export function logDebug(message: LazyArg<string>): Effect<never, never, void> {
  return new ILogged(message, () => Cause.empty, someDebug, null, null)
}

/**
 * Logs the specified cause at the debug log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logDebugCause
 */
export function logDebugCause<E>(cause: LazyArg<Cause<E>>): Effect<never, never, void> {
  return new ILogged(() => "", cause, someDebug, null, null)
}

/**
 * Logs the specified message and cause at the debug log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logDebugCauseMessage
 */
export function logDebugCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(message, cause, someDebug, null, null)
}

/**
 * Logs the specified message at the error log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logError
 */
export function logError(
  message: LazyArg<string>
): Effect<never, never, void> {
  return new ILogged(message, () => Cause.empty, someError, null, null)
}

/**
 * Logs the specified cause at the error log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logErrorCause
 */
export function logErrorCause<E>(
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(() => "", cause, someError, null, null)
}

/**
 * Logs the specified message and cause at the error log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logErrorCauseMessage
 */
export function logErrorCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(message, cause, someError, null, null)
}

/**
 * Logs the specified message at the fatal log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logFatal
 */
export function logFatal(
  message: LazyArg<string>
): Effect<never, never, void> {
  return new ILogged(message, () => Cause.empty, someFatal, null, null)
}

/**
 * Logs the specified cause at the fatal log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logFatalCause
 */
export function logFatalCause<E>(
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(() => "", cause, someFatal, null, null)
}

/**
 * Logs the specified message and cause at the fatal log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logFatalCauseMessage
 */
export function logFatalCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(message, cause, someFatal, null, null)
}

/**
 * Logs the specified message at the informational log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logInfo
 */
export function logInfo(
  message: LazyArg<string>
): Effect<never, never, void> {
  return new ILogged(message, () => Cause.empty, someInfo, null, null)
}

/**
 * Logs the specified cause at the informational log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logInfoCause
 */
export function logInfoCause<E>(
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(() => "", cause, someInfo, null, null)
}

/**
 * Logs the specified message and cause at the informational log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logInfoCauseMessage
 */
export function logInfoCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(message, cause, someInfo, null, null)
}

/**
 * Logs the specified message at the warning log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logWarning
 */
export function logWarning(
  message: LazyArg<string>
): Effect<never, never, void> {
  return new ILogged(message, () => Cause.empty, someWarning, null, null)
}

/**
 * Logs the specified cause at the warning log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logWarningCause
 */
export function logWarningCause<E>(
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(() => "", cause, someWarning, null, null)
}

/**
 * Logs the specified message and cause at the warning log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logWarningCauseMessage
 */
export function logWarningCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(message, cause, someWarning, null, null)
}

/**
 * Logs the specified message at the trace log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logTrace
 */
export function logTrace(
  message: LazyArg<string>
): Effect<never, never, void> {
  return new ILogged(message, () => Cause.empty, someTrace, null, null)
}

/**
 * Logs the specified cause at the trace log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logTraceCause
 */
export function logTraceCause<E>(
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(() => "", cause, someTrace, null, null)
}

/**
 * Logs the specified message and cause at the trace log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logTraceCauseMessage
 */
export function logTraceCauseMessage<E>(
  message: LazyArg<string>,
  cause: LazyArg<Cause<E>>
): Effect<never, never, void> {
  return new ILogged(message, cause, someTrace, null, null)
}

/**
 * Adjusts the label for the current logging span.
 *
 * @tsplus static effect/core/io/Effect.Ops logSpan
 */
export function logSpan(label: LazyArg<string>) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    FiberRef.currentLogSpan.get.flatMap((stack) =>
      Effect.suspendSucceed(() => {
        const now = Date.now()
        const logSpan = LogSpan(label(), now)
        return effect.apply(
          FiberRef.currentLogSpan.locally(stack.prepend(logSpan))
        )
      })
    )
}

/**
 * Annotates each log in this effect with the specified log annotation.
 *
 * @tsplus static effect/core/io/Effect.Ops logAnnotate
 */
export function logAnnotate(key: LazyArg<string>, value: LazyArg<string>) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    FiberRef.currentLogAnnotations
      .get
      .flatMap((annotations) =>
        Effect.suspendSucceed(() =>
          effect.apply(
            FiberRef.currentLogAnnotations.locally(
              annotations.set(key(), value())
            )
          )
        )
      )
}

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @tsplus static effect/core/io/Effect.Ops logAnnotations
 */
export function logAnnotations(): Effect<never, never, ImmutableMap<string, string>> {
  return FiberRef.currentLogAnnotations.get
}

/**
 * An aspect that disables logging for the specified effect.
 *
 * @tsplus static effect/core/io/Effect.Ops disableLogging
 */
export function disableLogging<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
  return Effect.runtimeConfig.flatMap((runtimeConfig) =>
    Effect.withRuntimeConfig(
      RuntimeConfig({ ...runtimeConfig.value, loggers: HashSet.empty() }),
      effect
    )
  )
}
