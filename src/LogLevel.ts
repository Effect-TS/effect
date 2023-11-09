import type { All, Debug, Error, Fatal, Info, None, Trace, Warning } from "./impl/LogLevel.js"

export * from "./impl/LogLevel.js"
export * from "./internal/Jumpers/LogLevel.js"

export declare namespace LogLevel {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/LogLevel.js"
}
/**
 * A `LogLevel` represents the log level associated with an individual logging
 * operation. Log levels are used both to describe the granularity (or
 * importance) of individual log statements, as well as to enable tuning
 * verbosity of log output.
 *
 * @since 2.0.0
 * @category model
 * @property ordinal - The priority of the log message. Larger values indicate higher priority.
 * @property label - A label associated with the log level.
 * @property syslog -The syslog severity level of the log level.
 */
export type LogLevel = All | Fatal | Error | Warning | Info | Debug | Trace | None
