/**
 * @tsplus pipeable-operator effect/core/io/LogLevel <
 * @tsplus static effect/core/io/LogLevel.Aspects lessThen
 * @tsplus pipeable effect/core/io/LogLevel lessThan
 */
export function lessThan(that: LogLevel) {
  return (self: LogLevel): boolean => LogLevel.ord.lt(self, that)
}

/**
 * @tsplus pipeable-operator effect/core/io/LogLevel <=
 * @tsplus static effect/core/io/LogLevel.Aspects lessThanEqual
 * @tsplus pipeable effect/core/io/LogLevel lessThanEqual
 */
export function lessThanEqual(that: LogLevel) {
  return (self: LogLevel): boolean => LogLevel.ord.leq(self, that)
}

/**
 * @tsplus pipeable-operator effect/core/io/LogLevel >
 * @tsplus static effect/core/io/LogLevel.Aspects greaterThan
 * @tsplus pipeable effect/core/io/LogLevel greaterThan
 */
export function greaterThan(that: LogLevel) {
  return (self: LogLevel): boolean => LogLevel.ord.gt(self, that)
}

/**
 * @tsplus pipeable-operator effect/core/io/LogLevel >=
 * @tsplus static effect/core/io/LogLevel.Aspects greaterThanEqual
 * @tsplus pipeable effect/core/io/LogLevel greaterThanEqual
 */
export function greaterThanEqual(that: LogLevel) {
  return (self: LogLevel): boolean => !LogLevel.ord.lt(self, that)
}
