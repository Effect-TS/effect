import type * as LogLevel from "../LogLevel.js"
import { pipeArguments } from "../Pipeable.js"

/** @internal */
export const all: LogLevel.LogLevel = {
  _tag: "All",
  syslog: 0,
  label: "ALL",
  ordinal: Number.MIN_SAFE_INTEGER,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const fatal: LogLevel.LogLevel = {
  _tag: "Fatal",
  syslog: 2,
  label: "FATAL",
  ordinal: 50000,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const error: LogLevel.LogLevel = {
  _tag: "Error",
  syslog: 3,
  label: "ERROR",
  ordinal: 40000,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const warning: LogLevel.LogLevel = {
  _tag: "Warning",
  syslog: 4,
  label: "WARN",
  ordinal: 30000,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const info: LogLevel.LogLevel = {
  _tag: "Info",
  syslog: 6,
  label: "INFO",
  ordinal: 20000,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const debug: LogLevel.LogLevel = {
  _tag: "Debug",
  syslog: 7,
  label: "DEBUG",
  ordinal: 10000,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const trace: LogLevel.LogLevel = {
  _tag: "Trace",
  syslog: 7,
  label: "TRACE",
  ordinal: 0,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const none: LogLevel.LogLevel = {
  _tag: "None",
  syslog: 7,
  label: "OFF",
  ordinal: Number.MAX_SAFE_INTEGER,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const allLevels: ReadonlyArray<LogLevel.LogLevel> = [
  all,
  trace,
  debug,
  info,
  warning,
  error,
  fatal,
  none
]

/** @internal */
export const fromLiteral = (literal: LogLevel.Literal): LogLevel.LogLevel => {
  switch (literal) {
    case "All":
      return all
    case "Debug":
      return debug
    case "Error":
      return error
    case "Fatal":
      return fatal
    case "Info":
      return info
    case "Trace":
      return trace
    case "None":
      return none
    case "Warning":
      return warning
  }
}
