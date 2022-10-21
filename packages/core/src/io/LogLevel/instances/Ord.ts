/**
 * @tsplus static effect/core/io/LogLevel.Ops ord
 */
export const ordLogLevel = Ord.number.contramap((level: LogLevel) => level.ordinal)
