/**
 * @since 2.0.0
 */
import type { Effect } from "./exports/Effect.js"
import { dual, pipe } from "./exports/Function.js"
import * as number from "./exports/Number.js"
import * as order from "./exports/Order.js"
import type { Pipeable } from "./exports/Pipeable.js"
import * as core from "./internal/core.js"

import type { LogLevel } from "./exports/LogLevel.js"

/**
 * @since 2.0.0
 * @category model
 */
export type Literal = LogLevel["_tag"]

/**
 * @since 2.0.0
 * @category model
 */
export interface All extends Pipeable {
  readonly _tag: "All"
  readonly label: "ALL"
  readonly syslog: 0
  readonly ordinal: number
}

/**
 * @since 2.0.0
 * @category model
 */
export interface Fatal extends Pipeable {
  readonly _tag: "Fatal"
  readonly label: "FATAL"
  readonly syslog: 2
  readonly ordinal: number
}

/**
 * @since 2.0.0
 * @category model
 */
export interface Error extends Pipeable {
  readonly _tag: "Error"
  readonly label: "ERROR"
  readonly syslog: 3
  readonly ordinal: number
}

/**
 * @since 2.0.0
 * @category model
 */
export interface Warning extends Pipeable {
  readonly _tag: "Warning"
  readonly label: "WARN"
  readonly syslog: 4
  readonly ordinal: number
}

/**
 * @since 2.0.0
 * @category model
 */
export interface Info extends Pipeable {
  readonly _tag: "Info"
  readonly label: "INFO"
  readonly syslog: 6
  readonly ordinal: number
}

/**
 * @since 2.0.0
 * @category model
 */
export interface Debug extends Pipeable {
  readonly _tag: "Debug"
  readonly label: "DEBUG"
  readonly syslog: 7
  readonly ordinal: number
}

/**
 * @since 2.0.0
 * @category model
 */
export interface Trace extends Pipeable {
  readonly _tag: "Trace"
  readonly label: "TRACE"
  readonly syslog: 7
  readonly ordinal: number
}

/**
 * @since 2.0.0
 * @category model
 */
export interface None extends Pipeable {
  readonly _tag: "None"
  readonly label: "OFF"
  readonly syslog: 7
  readonly ordinal: number
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const All: LogLevel = core.logLevelAll

/**
 * @since 2.0.0
 * @category constructors
 */
export const Fatal: LogLevel = core.logLevelFatal

/**
 * @since 2.0.0
 * @category constructors
 */
export const Error: LogLevel = core.logLevelError

/**
 * @since 2.0.0
 * @category constructors
 */
export const Warning: LogLevel = core.logLevelWarning

/**
 * @since 2.0.0
 * @category constructors
 */
export const Info: LogLevel = core.logLevelInfo

/**
 * @since 2.0.0
 * @category constructors
 */
export const Debug: LogLevel = core.logLevelDebug

/**
 * @since 2.0.0
 * @category constructors
 */
export const Trace: LogLevel = core.logLevelTrace

/**
 * @since 2.0.0
 * @category constructors
 */
export const None: LogLevel = core.logLevelNone

/**
 * @since 2.0.0
 * @category constructors
 */
export const allLevels = core.allLogLevels

/**
 * Locally applies the specified `LogLevel` to an `Effect` workflow, reverting
 * to the previous `LogLevel` after the `Effect` workflow completes.
 *
 * @since 2.0.0
 * @category utils
 */
export const locally: {
  (self: LogLevel): <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B>(use: Effect<R, E, B>, self: LogLevel): Effect<R, E, B>
} = dual<
  (self: LogLevel) => <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B>,
  <R, E, B>(use: Effect<R, E, B>, self: LogLevel) => Effect<R, E, B>
>(2, (use, self) => core.fiberRefLocally(use, core.currentLogLevel, self))

/**
 * @since 2.0.0
 * @category instances
 */
export const Order: order.Order<LogLevel> = pipe(
  number.Order,
  order.mapInput((level: LogLevel) => level.ordinal)
)

/**
 * @since 2.0.0
 * @category ordering
 */
export const lessThan: {
  (that: LogLevel): (self: LogLevel) => boolean
  (self: LogLevel, that: LogLevel): boolean
} = order.lessThan(Order)

/**
 * @since 2.0.0
 * @category ordering
 */
export const lessThanEqual: {
  (that: LogLevel): (self: LogLevel) => boolean
  (self: LogLevel, that: LogLevel): boolean
} = order.lessThanOrEqualTo(Order)

/**
 * @since 2.0.0
 * @category ordering
 */
export const greaterThan: {
  (that: LogLevel): (self: LogLevel) => boolean
  (self: LogLevel, that: LogLevel): boolean
} = order.greaterThan(Order)

/**
 * @since 2.0.0
 * @category ordering
 */
export const greaterThanEqual: {
  (that: LogLevel): (self: LogLevel) => boolean
  (self: LogLevel, that: LogLevel): boolean
} = order.greaterThanOrEqualTo(Order)

/**
 * @since 2.0.0
 * @category conversions
 */
export const fromLiteral = (
  _: Literal
): LogLevel => {
  switch (_) {
    case "All": {
      return All
    }
    case "Debug": {
      return Debug
    }
    case "Error": {
      return Error
    }
    case "Fatal": {
      return Fatal
    }
    case "Info": {
      return Info
    }
    case "Trace": {
      return Trace
    }
    case "None": {
      return None
    }
    case "Warning": {
      return Warning
    }
  }
}
