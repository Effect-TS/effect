import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../../io/Cause"
import { Effect } from "../../../io/Effect"
import type { LogLevel } from "../../../io/LogLevel"
import { Managed } from "../../../io/Managed"
import { Stream } from "../definition"

/**
 * Logs the specified message at the current log level.
 *
 * @tsplus static ets/StreamOps log
 */
export function log(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.fromEffect(Effect.log(message))
}

/**
 * Logs the specified message at the debug log level.
 */
export function logDebug(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.fromEffect(Effect.logDebug(message))
}

/**
 * Logs the specified message at the error log level.
 */
export function logError(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.fromEffect(Effect.logError(message))
}

/**
 * Logs the specified cause as an error.
 */
export function logErrorCause<E>(
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.fromEffect(Effect.logErrorCause(cause))
}

/**
 * Logs the specified message at the fatal log level.
 */
export function logFatal(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.fromEffect(Effect.logFatal(message))
}

/**
 * Logs the specified message at the informational log level.
 */
export function logInfo(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.fromEffect(Effect.logInfo(message))
}

/**
 * Logs the specified message at the warning log level.
 */
export function logWarning(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.fromEffect(Effect.logWarning(message))
}

/**
 * Logs the specified message at the trace log level.
 */
export function logTrace(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.fromEffect(Effect.logTrace(message))
}

/**
 * Sets the log level for streams composed after this.
 */
export function logLevel(
  level: LogLevel,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.managed(Managed.logLevel(level))
}

/**
 * Adjusts the label for the logging span for streams composed after this.
 */
export function logSpan(
  label: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, void> {
  return Stream.managed(Managed.logSpan(label))
}
