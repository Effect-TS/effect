import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

const someFatal = Option.some(LogLevel.Fatal)
const someError = Option.some(LogLevel.Error)
const someWarning = Option.some(LogLevel.Warning)
const someTrace = Option.some(LogLevel.Trace)
const someInfo = Option.some(LogLevel.Info)
const someDebug = Option.some(LogLevel.Debug)

/**
 * Logs the specified message at the current log level.
 *
 * @tsplus static effect/core/io/Effect.Ops log
 * @category logging
 * @since 1.0.0
 */
export function log(message: string): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, Cause.empty, Option.none)
    return Effect.unit
  })
}

/**
 * Logs the specified message at the debug log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logDebug
 * @category logging
 * @since 1.0.0
 */
export function logDebug(message: string): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, Cause.empty, someDebug)
    return Effect.unit
  })
}

/**
 * Logs the specified cause at the debug log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logDebugCause
 * @category logging
 * @since 1.0.0
 */
export function logDebugCause<E>(cause: Cause<E>): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log("", cause, someDebug)
    return Effect.unit
  })
}

/**
 * Logs the specified message and cause at the debug log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logDebugCauseMessage
 * @category logging
 * @since 1.0.0
 */
export function logDebugCauseMessage<E>(
  message: string,
  cause: Cause<E>
): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, cause, someDebug)
    return Effect.unit
  })
}

/**
 * Logs the specified message at the error log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logError
 * @category logging
 * @since 1.0.0
 */
export function logError(message: string): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, Cause.empty, someError)
    return Effect.unit
  })
}

/**
 * Logs the specified cause at the error log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logErrorCause
 * @category logging
 * @since 1.0.0
 */
export function logErrorCause<E>(cause: Cause<E>): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log("", cause, someError)
    return Effect.unit
  })
}

/**
 * Logs the specified message and cause at the error log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logErrorCauseMessage
 * @category logging
 * @since 1.0.0
 */
export function logErrorCauseMessage<E>(
  message: string,
  cause: Cause<E>
): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, cause, someError)
    return Effect.unit
  })
}

/**
 * Logs the specified message at the fatal log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logFatal
 * @category logging
 * @since 1.0.0
 */
export function logFatal(message: string): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, Cause.empty, someFatal)
    return Effect.unit
  })
}

/**
 * Logs the specified cause at the fatal log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logFatalCause
 * @category logging
 * @since 1.0.0
 */
export function logFatalCause<E>(
  cause: Cause<E>
): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log("", cause, someFatal)
    return Effect.unit
  })
}

/**
 * Logs the specified message and cause at the fatal log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logFatalCauseMessage
 * @category logging
 * @since 1.0.0
 */
export function logFatalCauseMessage<E>(
  message: string,
  cause: Cause<E>
): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, cause, someFatal)
    return Effect.unit
  })
}

/**
 * Logs the specified message at the informational log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logInfo
 * @category logging
 * @since 1.0.0
 */
export function logInfo(message: string): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, Cause.empty, someInfo)
    return Effect.unit
  })
}

/**
 * Logs the specified cause at the informational log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logInfoCause
 * @category logging
 * @since 1.0.0
 */
export function logInfoCause<E>(cause: Cause<E>): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log("", cause, someInfo)
    return Effect.unit
  })
}

/**
 * Logs the specified message and cause at the informational log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logInfoCauseMessage
 * @category logging
 * @since 1.0.0
 */
export function logInfoCauseMessage<E>(
  message: string,
  cause: Cause<E>
): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, cause, someInfo)
    return Effect.unit
  })
}

/**
 * Logs the specified message at the warning log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logWarning
 * @category logging
 * @since 1.0.0
 */
export function logWarning(message: string): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, Cause.empty, someWarning)
    return Effect.unit
  })
}

/**
 * Logs the specified cause at the warning log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logWarningCause
 * @category logging
 * @since 1.0.0
 */
export function logWarningCause<E>(
  cause: Cause<E>
): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log("", cause, someWarning)
    return Effect.unit
  })
}

/**
 * Logs the specified message and cause at the warning log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logWarningCauseMessage
 * @category logging
 * @since 1.0.0
 */
export function logWarningCauseMessage<E>(
  message: string,
  cause: Cause<E>
): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, cause, someWarning)
    return Effect.unit
  })
}

/**
 * Logs the specified message at the trace log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logTrace
 * @category logging
 * @since 1.0.0
 */
export function logTrace(message: string): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, Cause.empty, someTrace)
    return Effect.unit
  })
}

/**
 * Logs the specified cause at the trace log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logTraceCause
 * @category logging
 * @since 1.0.0
 */
export function logTraceCause<E>(cause: Cause<E>): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log("", cause, someTrace)
    return Effect.unit
  })
}

/**
 * Logs the specified message and cause at the trace log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logTraceCauseMessage
 * @category logging
 * @since 1.0.0
 */
export function logTraceCauseMessage<E>(
  message: string,
  cause: Cause<E>
): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, cause, someTrace)
    return Effect.unit
  })
}

/**
 * Adjusts the label for the current logging span.
 *
 * @tsplus static effect/core/io/Effect.Ops logSpan
 * @category logging
 * @since 1.0.0
 */
export function logSpan(label: string) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    FiberRef.currentLogSpan.get.flatMap((stack) =>
      Clock.currentTime.flatMap((now) =>
        Effect.suspendSucceed(() => {
          const logSpan = LogSpan(label, now)
          return effect.apply(
            FiberRef.currentLogSpan.locally(pipe(stack, List.prepend(logSpan)))
          )
        })
      )
    )
}

/**
 * Annotates each log in this effect with the specified log annotation.
 *
 * @tsplus static effect/core/io/Effect.Ops logAnnotate
 * @category logging
 * @since 1.0.0
 */
export function logAnnotate(key: string, value: string) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    FiberRef.currentLogAnnotations
      .get
      .flatMap((annotations) =>
        Effect.suspendSucceed(() =>
          effect.apply(
            FiberRef.currentLogAnnotations.locally(
              (annotations as Map<string, string>).set(key, value)
            )
          )
        )
      )
}

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @tsplus static effect/core/io/Effect.Ops logAnnotations
 * @category logging
 * @since 1.0.0
 */
export function logAnnotations(): Effect<never, never, ReadonlyMap<string, string>> {
  return FiberRef.currentLogAnnotations.get
}
