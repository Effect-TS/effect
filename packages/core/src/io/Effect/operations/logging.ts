import * as Map from "../../../collection/immutable/Map"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Cause } from "../../Cause"
import { currentLogAnnotations, currentLogSpan } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { locally_ as fiberRefLocally_ } from "../../FiberRef/operations/locally"
import { Logger } from "../../Logger"
import { LogLevel } from "../../LogLevel"
import { LogSpan } from "../../LogSpan"
import { RuntimeConfig } from "../../RuntimeConfig"
import type { UIO } from "../definition"
import { Effect, ILogged } from "../definition"

const someFatal = Option.some(LogLevel.Fatal)
const someError = Option.some(LogLevel.Error)
const someWarning = Option.some(LogLevel.Warning)
const someInfo = Option.some(LogLevel.Info)
const someDebug = Option.some(LogLevel.Debug)

/**
 * Logs the specified message at the current log level.
 *
 * @tsplus static ets/EffectOps log
 */
export function log(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, Option.none, null, null, __tsplusTrace)
}

/**
 * Logs the specified message at the debug log level.
 *
 * @tsplus static ets/EffectOps logDebug
 */
export function logDebug(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someDebug, null, null, __tsplusTrace)
}

/**
 * Logs the specified cause at the debug log level.
 *
 * @tsplus static ets/EffectOps logDebugCause
 */
export function logDebugCause(
  cause: LazyArg<Cause<any>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someDebug, null, null, __tsplusTrace)
}

/**
 * Logs the specified message and cause at the debug log level.
 *
 * @tsplus static ets/EffectOps logDebugCauseMessage
 */
export function logDebugCauseMessage(
  message: LazyArg<string>,
  cause: LazyArg<Cause<any>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someDebug, null, null, __tsplusTrace)
}

/**
 * Logs the specified message at the error log level.
 *
 * @tsplus static ets/EffectOps logError
 */
export function logError(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someError, null, null, __tsplusTrace)
}

/**
 * Logs the specified cause at the error log level.
 *
 * @tsplus static ets/EffectOps logErrorCause
 */
export function logErrorCause(
  cause: LazyArg<Cause<any>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someError, null, null, __tsplusTrace)
}

/**
 * Logs the specified message and cause at the error log level.
 *
 * @tsplus static ets/EffectOps logErrorCauseMessage
 */
export function logErrorCauseMessage(
  message: LazyArg<string>,
  cause: LazyArg<Cause<any>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someError, null, null, __tsplusTrace)
}

/**
 * Logs the specified message at the fatal log level.
 *
 * @tsplus static ets/EffectOps logFatal
 */
export function logFatal(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someFatal, null, null, __tsplusTrace)
}

/**
 * Logs the specified cause at the fatal log level.
 *
 * @tsplus static ets/EffectOps logFatalCause
 */
export function logFatalCause(
  cause: LazyArg<Cause<any>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someFatal, null, null, __tsplusTrace)
}

/**
 * Logs the specified message and cause at the fatal log level.
 *
 * @tsplus static ets/EffectOps logFatalCauseMessage
 */
export function logFatalCauseMessage(
  message: LazyArg<string>,
  cause: LazyArg<Cause<any>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someFatal, null, null, __tsplusTrace)
}

/**
 * Logs the specified message at the informational log level.
 *
 * @tsplus static ets/EffectOps logInfo
 */
export function logInfo(message: LazyArg<string>, __tsplusTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someInfo, null, null, __tsplusTrace)
}

/**
 * Logs the specified cause at the informational log level.
 *
 * @tsplus static ets/EffectOps logInfoCause
 */
export function logInfoCause(
  cause: LazyArg<Cause<any>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someInfo, null, null, __tsplusTrace)
}

/**
 * Logs the specified message and cause at the informational log level.
 *
 * @tsplus static ets/EffectOps logInfoCauseMessage
 */
export function logInfoCauseMessage(
  message: LazyArg<string>,
  cause: LazyArg<Cause<any>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someInfo, null, null, __tsplusTrace)
}

/**
 * Logs the specified message at the warning log level.
 *
 * @tsplus static ets/EffectOps logWarning
 */
export function logWarning(
  message: LazyArg<string>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, () => Cause.empty, someWarning, null, null, __tsplusTrace)
}

/**
 * Logs the specified cause at the warning log level.
 *
 * @tsplus static ets/EffectOps logWarningCause
 */
export function logWarningCause(
  cause: LazyArg<Cause<any>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someWarning, null, null, __tsplusTrace)
}

/**
 * Logs the specified message and cause at the warning log level.
 *
 * @tsplus static ets/EffectOps logWarningCauseMessage
 */
export function logWarningCauseMessage(
  message: LazyArg<string>,
  cause: LazyArg<Cause<any>>,
  __tsplusTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someWarning, null, null, __tsplusTrace)
}

/**
 * Adjusts the label for the current logging span.
 *
 * @tsplus static ets/EffectOps logSpan
 */
export function logSpan(label: LazyArg<string>) {
  return <R, E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    fiberRefGet(currentLogSpan.value).flatMap((stack) =>
      Effect.suspendSucceed(() => {
        const now = Date.now()
        const logSpan = LogSpan(label(), now)
        return fiberRefLocally_(currentLogSpan.value, stack.prepend(logSpan))(effect)
      })
    )
}

/**
 * Annotates each log in this effect with the specified log annotation.
 *
 * @tsplus static ets/EffectOps logAnnotate
 */
export function logAnnotate(key: LazyArg<string>, value: LazyArg<string>) {
  return <R, E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    fiberRefGet(currentLogAnnotations.value).flatMap((annotations) =>
      Effect.suspendSucceed(() =>
        fiberRefLocally_(
          currentLogAnnotations.value,
          Map.insert_(annotations, key(), value())
        )(effect)
      )
    )
}

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @tsplus static ets/EffectOps logAnnotations
 */
export function logAnnotations(__tsplusTrace?: string): UIO<Map.Map<string, string>> {
  return fiberRefGet(currentLogAnnotations.value)
}

/**
 * An aspect that disables logging for the specified effect.
 *
 * @tsplus static ets/EffectOps disableLogging
 */
export function disableLogging<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
  return Effect.runtimeConfig.flatMap((runtimeConfig) =>
    Effect.withRuntimeConfig(
      RuntimeConfig({ ...runtimeConfig.value, logger: Logger.none }),
      effect
    )
  )
}
