/**
 * @since 2.0.0
 */
import type * as Effect from "./Effect.js"
import { dual, pipe } from "./Function.js"
import * as core from "./internal/core.js"
import * as internalFiberRef from "./internal/fiberRef.js"
import * as internal from "./internal/logLevel.js"
import * as number from "./Number.js"
import * as order from "./Order.js"
import type { Pipeable } from "./Pipeable.js"

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
export const All: LogLevel = internal.all

/**
 * @since 2.0.0
 * @category constructors
 */
export const Fatal: LogLevel = internal.fatal

/**
 * @since 2.0.0
 * @category constructors
 */
export const Error: LogLevel = internal.error

/**
 * @since 2.0.0
 * @category constructors
 */
export const Warning: LogLevel = internal.warning

/**
 * @since 2.0.0
 * @category constructors
 */
export const Info: LogLevel = internal.info

/**
 * @since 2.0.0
 * @category constructors
 */
export const Debug: LogLevel = internal.debug

/**
 * @since 2.0.0
 * @category constructors
 */
export const Trace: LogLevel = internal.trace

/**
 * @since 2.0.0
 * @category constructors
 */
export const None: LogLevel = internal.none

/**
 * @since 2.0.0
 * @category constructors
 */
export const allLevels: ReadonlyArray<LogLevel> = internal.allLevels

/**
 * Locally applies the specified `LogLevel` to an `Effect` workflow, reverting
 * to the previous `LogLevel` after the `Effect` workflow completes.
 *
 * @since 2.0.0
 * @category utils
 */
export const locally: {
  (self: LogLevel): <A, E, R>(use: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(use: Effect.Effect<A, E, R>, self: LogLevel): Effect.Effect<A, E, R>
} = dual(
  2,
  <A, E, R>(use: Effect.Effect<A, E, R>, self: LogLevel): Effect.Effect<A, E, R> =>
    core.fiberRefLocally(use, internalFiberRef.currentLogLevel, self)
)

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
export const fromLiteral: (
  literal: Literal
) => LogLevel = internal.fromLiteral
