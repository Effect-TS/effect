import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Cause } from "../../Cause"
import { LogLevel } from "../../LogLevel"
import type { UIO } from "../definition"
import { ILogged } from "../definition"

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
export function log(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, Option.none, null, null, __etsTrace)
}

/**
 * Logs the specified message at the debug log level.
 *
 * @tsplus static ets/EffectOps logDebug
 */
export function logDebug(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someDebug, null, null, __etsTrace)
}

/**
 * Logs the specified message at the error log level.
 *
 * @tsplus static ets/EffectOps logError
 */
export function logError(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someError, null, null, __etsTrace)
}

/**
 * Logs the specified cause as an error.
 *
 * @tsplus static ets/EffectOps logErrorCause
 */
export function logErrorCause(
  cause: LazyArg<Cause<any>>,
  __etsTrace?: string
): UIO<void> {
  return new ILogged(() => "", cause, someError, null, null, __etsTrace)
}

/**
 * Logs the specified message and cause as an error.
 *
 * @tsplus static ets/EffectOps logErrorCauseMessage
 */
export function logErrorCauseMessage(
  message: LazyArg<string>,
  cause: LazyArg<Cause<any>>,
  __etsTrace?: string
): UIO<void> {
  return new ILogged(message, cause, someError, null, null, __etsTrace)
}

/**
 * Logs the specified message at the fatal log level.
 *
 * @tsplus static ets/EffectOps logFatal
 */
export function logFatal(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someFatal, null, null, __etsTrace)
}

/**
 * Logs the specified message at the informational log level.
 *
 * @tsplus static ets/EffectOps logInfo
 */
export function logInfo(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someInfo, null, null, __etsTrace)
}

/**
 * Logs the specified message at the warning log level.
 *
 * @tsplus static ets/EffectOps logWarning
 */
export function logWarning(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(message, () => Cause.empty, someWarning, null, null, __etsTrace)
}
