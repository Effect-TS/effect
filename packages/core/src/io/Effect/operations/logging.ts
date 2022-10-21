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
export function log(message: string): Effect<never, never, void> {
  return Effect.withFiberRuntime((fiberState) => {
    fiberState.log(message, Cause.empty, Maybe.none)
    return Effect.unit
  })
}

/**
 * Logs the specified message at the debug log level.
 *
 * @tsplus static effect/core/io/Effect.Ops logDebug
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
 */
export function logSpan(label: string) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    FiberRef.currentLogSpan.get.flatMap((stack) =>
      Clock.currentTime.flatMap((now) =>
        Effect.suspendSucceed(() => {
          const logSpan = LogSpan(label, now)
          return effect.apply(
            FiberRef.currentLogSpan.locally(stack.prepend(logSpan))
          )
        })
      )
    )
}

/**
 * Annotates each log in this effect with the specified log annotation.
 *
 * @tsplus static effect/core/io/Effect.Ops logAnnotate
 */
export function logAnnotate(key: string, value: string) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    FiberRef.currentLogAnnotations
      .get
      .flatMap((annotations) =>
        Effect.suspendSucceed(() =>
          effect.apply(
            FiberRef.currentLogAnnotations.locally(
              annotations.set(key, value)
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
