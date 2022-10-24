import * as Order from "@fp-ts/core/typeclass/Order"

/**
 * @tsplus pipeable-operator effect/core/io/LogLevel <
 * @tsplus static effect/core/io/LogLevel.Aspects lessThen
 * @tsplus pipeable effect/core/io/LogLevel lessThan
 * @category ordering
 * @since 1.0.0
 */
export const lessThan: (that: LogLevel) => (self: LogLevel) => boolean = Order.lessThan(
  LogLevel.Order
)

/**
 * @tsplus pipeable-operator effect/core/io/LogLevel <=
 * @tsplus static effect/core/io/LogLevel.Aspects lessThanEqual
 * @tsplus pipeable effect/core/io/LogLevel lessThanEqual
 * @category ordering
 * @since 1.0.0
 */
export const lessThanEqual: (that: LogLevel) => (self: LogLevel) => boolean = Order
  .lessThanOrEqualTo(LogLevel.Order)

/**
 * @tsplus pipeable-operator effect/core/io/LogLevel >
 * @tsplus static effect/core/io/LogLevel.Aspects greaterThan
 * @tsplus pipeable effect/core/io/LogLevel greaterThan
 * @category ordering
 * @since 1.0.0
 */
export const greaterThan: (that: LogLevel) => (self: LogLevel) => boolean = Order.greaterThan(
  LogLevel.Order
)

/**
 * @tsplus pipeable-operator effect/core/io/LogLevel >=
 * @tsplus static effect/core/io/LogLevel.Aspects greaterThanEqual
 * @tsplus pipeable effect/core/io/LogLevel greaterThanEqual
 * @category ordering
 * @since 1.0.0
 */
export const greaterThanEqual: (that: LogLevel) => (self: LogLevel) => boolean = Order
  .greaterThanOrEqualTo(LogLevel.Order)
