import type { LazyArg } from "../../../data/Function"
import * as O from "../../../data/Option"
import type { Cause } from "../../Cause"
import { CauseLogger } from "../../Logger/operations/defaultCause"
import { StringLogger } from "../../Logger/operations/defaultString"
import * as LogLevel from "../../LogLevel"
import type { UIO } from "../definition"
import { ILogged } from "../definition"

const someFatal = O.some(LogLevel.Fatal)
const someError = O.some(LogLevel.Error)
const someWarning = O.some(LogLevel.Warning)
const someInfo = O.some(LogLevel.Info)
const someDebug = O.some(LogLevel.Debug)

/**
 * Logs the specified message at the current log level.
 *
 * @tsplus static ets/EffectOps log
 */
export function log(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(StringLogger, message, O.none, null, null, __etsTrace)
}

/**
 * Logs the specified message at the debug log level.
 *
 * @tsplus static ets/EffectOps logDebug
 */
export function logDebug(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(StringLogger, message, someDebug, null, null, __etsTrace)
}

/**
 * Logs the specified message at the error log level.
 *
 * @tsplus static ets/EffectOps logError
 */
export function logError(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(StringLogger, message, someError, null, null, __etsTrace)
}

/**
 * Logs the specified cause as an error.
 *
 * @tsplus static ets/EffectOps logErrorCause
 */
export function logErrorCause(
  message: LazyArg<Cause<any>>,
  __etsTrace?: string
): UIO<void> {
  return new ILogged(CauseLogger, message, someError, null, null, __etsTrace)
}

/**
 * Logs the specified message at the fatal log level.
 *
 * @tsplus static ets/EffectOps logFatal
 */
export function logFatal(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(StringLogger, message, someFatal, null, null, __etsTrace)
}

/**
 * Logs the specified message at the informational log level.
 *
 * @tsplus static ets/EffectOps logInfo
 */
export function logInfo(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(StringLogger, message, someInfo, null, null, __etsTrace)
}

/**
 * Logs the specified message at the warning log level.
 *
 * @tsplus static ets/EffectOps logWarning
 */
export function logWarning(message: LazyArg<string>, __etsTrace?: string): UIO<void> {
  return new ILogged(StringLogger, message, someWarning, null, null, __etsTrace)
}
