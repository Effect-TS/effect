/**
 * A `LogLevel` represents the log level associated with an individual logging
 * operation. Log levels are used both to describe the granularity (or
 * importance) of individual log statements, as well as to enable tuning
 * verbosity of log output.
 *
 * @param ordinal
 *   The priority of the log message. Larger values indicate higher priority.
 * @param label
 *   A label associated with the log level.
 * @param syslog
 *   The syslog severity level of the log level.
 *
 * @tsplus type effect/core/io/LogLevel
 * @category model
 * @since 1.0.0
 */
export type LogLevel = All | Fatal | Error | Warning | Info | Debug | Trace | None

/**
 * @tsplus type effect/core/io/LogLevel.Ops
 * @category model
 * @since 1.0.0
 */
export interface LogLevelOps {
  $: LogLevelAspects
}
export const LogLevel: LogLevelOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/LogLevel.Aspects
 * @category model
 * @since 1.0.0
 */
export interface LogLevelAspects {}

/**
 * @category model
 * @since 1.0.0
 */
export interface All {
  readonly _tag: "All"
  readonly label: "ALL"
  readonly syslog: 0
  readonly ordinal: number
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Fatal {
  readonly _tag: "Fatal"
  readonly label: "FATAL"
  readonly syslog: 2
  readonly ordinal: number
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Error {
  readonly _tag: "Error"
  readonly label: "ERROR"
  readonly syslog: 3
  readonly ordinal: number
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Warning {
  readonly _tag: "Warning"
  readonly label: "WARN"
  readonly syslog: 4
  readonly ordinal: number
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Info {
  readonly _tag: "Info"
  readonly label: "INFO"
  readonly syslog: 6
  readonly ordinal: number
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Debug {
  readonly _tag: "Debug"
  readonly label: "DEBUG"
  readonly syslog: 7
  readonly ordinal: number
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Trace {
  readonly _tag: "Trace"
  readonly label: "TRACE"
  readonly syslog: 7
  readonly ordinal: number
}

/**
 * @category model
 * @since 1.0.0
 */
export interface None {
  readonly _tag: "None"
  readonly label: "OFF"
  readonly syslog: 7
  readonly ordinal: number
}

/**
 * @tsplus static effect/core/io/LogLevel.Ops All
 * @category constructors
 * @since 1.0.0
 */
export const All: LogLevel = {
  _tag: "All",
  syslog: 0,
  label: "ALL",
  ordinal: Number.MIN_SAFE_INTEGER
}

/**
 * @tsplus static effect/core/io/LogLevel.Ops Fatal
 * @category constructors
 * @since 1.0.0
 */
export const Fatal: LogLevel = {
  _tag: "Fatal",
  syslog: 2,
  label: "FATAL",
  ordinal: 50000
}

/**
 * @tsplus static effect/core/io/LogLevel.Ops Error
 * @category constructors
 * @since 1.0.0
 */
export const Error: LogLevel = {
  _tag: "Error",
  syslog: 3,
  label: "ERROR",
  ordinal: 40000
}

/**
 * @tsplus static effect/core/io/LogLevel.Ops Warning
 * @category constructors
 * @since 1.0.0
 */
export const Warning: LogLevel = {
  _tag: "Warning",
  syslog: 4,
  label: "WARN",
  ordinal: 30000
}

/**
 * @tsplus static effect/core/io/LogLevel.Ops Info
 * @category constructors
 * @since 1.0.0
 */
export const Info: LogLevel = {
  _tag: "Info",
  syslog: 6,
  label: "INFO",
  ordinal: 20000
}

/**
 * @tsplus static effect/core/io/LogLevel.Ops Debug
 * @category constructors
 * @since 1.0.0
 */
export const Debug: LogLevel = {
  _tag: "Debug",
  syslog: 7,
  label: "DEBUG",
  ordinal: 10000
}

/**
 * @tsplus static effect/core/io/LogLevel.Ops Trace
 * @category constructors
 * @since 1.0.0
 */
export const Trace: LogLevel = {
  _tag: "Trace",
  syslog: 7,
  label: "TRACE",
  ordinal: 0
}

/**
 * @tsplus static effect/core/io/LogLevel.Ops None
 * @category constructors
 * @since 1.0.0
 */
export const None: LogLevel = {
  _tag: "None",
  syslog: 7,
  label: "OFF",
  ordinal: Number.MAX_SAFE_INTEGER
}
