import type { Cause } from "../../Cause"
import type { LazyArg } from "../../Function"
import { CauseLogger } from "../../Logger/operations/defaultCause"
import { StringLogger } from "../../Logger/operations/defaultString"
import * as LogLevel from "../../LogLevel"
import * as O from "../../Option"
import type { UIO } from "../definition"
import { ILogged } from "../definition"

const someFatal = O.some(LogLevel.Fatal)
const someError = O.some(LogLevel.Error)
const someWarning = O.some(LogLevel.Warning)
const someInfo = O.some(LogLevel.Info)
const someDebug = O.some(LogLevel.Debug)

/**
 * Logs the specified message at the current log level.
 */
export function log(message: LazyArg<string>, __trace?: string): UIO<void> {
  return new ILogged(StringLogger, message, O.none, null, null, __trace)
}

/**
 * Logs the specified message at the debug log level.
 */
export function logDebug(message: LazyArg<string>, __trace?: string): UIO<void> {
  return new ILogged(StringLogger, message, someDebug, null, null, __trace)
}

/**
 * Logs the specified message at the error log level.
 */
export function logError(message: LazyArg<string>, __trace?: string): UIO<void> {
  return new ILogged(StringLogger, message, someError, null, null, __trace)
}

/**
 * Logs the specified cause as an error.
 */
export function logErrorCause(
  message: LazyArg<Cause<any>>,
  __trace?: string
): UIO<void> {
  return new ILogged(CauseLogger, message, someError, null, null, __trace)
}

/**
 * Logs the specified message at the fatal log level.
 */
export function logFatal(message: LazyArg<string>, __trace?: string): UIO<void> {
  return new ILogged(StringLogger, message, someFatal, null, null, __trace)
}

/**
 * Logs the specified message at the informational log level.
 */
export function logInfo(message: LazyArg<string>, __trace?: string): UIO<void> {
  return new ILogged(StringLogger, message, someInfo, null, null, __trace)
}

/**
 * Logs the specified message at the warning log level.
 */
export function logWarning(message: LazyArg<string>, __trace?: string): UIO<void> {
  return new ILogged(StringLogger, message, someWarning, null, null, __trace)
}
