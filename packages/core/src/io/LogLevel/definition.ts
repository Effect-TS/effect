/**
 * A `LogLevel` represents the log level associated with an individual logging
 * operation. Log levels are used both to describe the granularity (or
 * importance) of individual log statements, as well as to enable tuning
 * verbosity of log output.
 *
 * @tsplus type ets/LogLevel
 *
 * @param ordinal
 *   The priority of the log message. Larger values indicate higher priority.
 * @param label
 *   A label associated with the log level.
 * @param syslog
 *   The syslog severity level of the log level.
 */
export type LogLevel = All | Fatal | Error | Warning | Info | Debug | Runtime | None

/**
 * @tsplus type ets/LogLevelOps
 */
export interface LogLevelOps {}
export const LogLevel: LogLevelOps = {}

export interface All {
  readonly _tag: "All"
  readonly label: "ALL"
  readonly syslog: 0
  readonly ordinal: number
}

export interface Fatal {
  readonly _tag: "Fatal"
  readonly label: "FATAL"
  readonly syslog: 2
  readonly ordinal: number
}

export interface Error {
  readonly _tag: "Error"
  readonly label: "ERROR"
  readonly syslog: 3
  readonly ordinal: number
}

export interface Warning {
  readonly _tag: "Warning"
  readonly label: "WARN"
  readonly syslog: 4
  readonly ordinal: number
}

export interface Info {
  readonly _tag: "Info"
  readonly label: "INFO"
  readonly syslog: 6
  readonly ordinal: number
}

export interface Debug {
  readonly _tag: "Debug"
  readonly label: "DEBUG"
  readonly syslog: 7
  readonly ordinal: number
}

export interface Runtime {
  readonly _tag: "Runtime"
  readonly label: "RUNTIME"
  readonly syslog: 7
  readonly ordinal: number
}

export interface None {
  readonly _tag: "None"
  readonly label: "OFF"
  readonly syslog: 7
  readonly ordinal: number
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @tsplus static ets/LogLevelOps All
 */
export const All: LogLevel = {
  _tag: "All",
  syslog: 0,
  label: "ALL",
  ordinal: Number.MIN_SAFE_INTEGER
}

/**
 * @tsplus static ets/LogLevelOps Fatal
 */
export const Fatal: LogLevel = {
  _tag: "Fatal",
  syslog: 2,
  label: "FATAL",
  ordinal: 50000
}

/**
 * @tsplus static ets/LogLevelOps Error
 */
export const Error: LogLevel = {
  _tag: "Error",
  syslog: 3,
  label: "ERROR",
  ordinal: 40000
}

/**
 * @tsplus static ets/LogLevelOps Warning
 */
export const Warning: LogLevel = {
  _tag: "Warning",
  syslog: 4,
  label: "WARN",
  ordinal: 30000
}

/**
 * @tsplus static ets/LogLevelOps Info
 */
export const Info: LogLevel = {
  _tag: "Info",
  syslog: 6,
  label: "INFO",
  ordinal: 20000
}

/**
 * @tsplus static ets/LogLevelOps Debug
 */
export const Debug: LogLevel = {
  _tag: "Debug",
  syslog: 7,
  label: "DEBUG",
  ordinal: 10000
}

/**
 * @tsplus static ets/LogLevelOps Runtime
 */
export const Runtime: LogLevel = {
  _tag: "Runtime",
  syslog: 7,
  label: "RUNTIME",
  ordinal: 0
}

/**
 * @tsplus static ets/LogLevelOps None
 */
export const None: LogLevel = {
  _tag: "None",
  syslog: 7,
  label: "OFF",
  ordinal: Number.MAX_SAFE_INTEGER
}
