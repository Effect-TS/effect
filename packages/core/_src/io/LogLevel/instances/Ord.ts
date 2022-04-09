/**
 * @tsplus static ets/LogLevel/Ops ord
 */
export const ordLogLevel = Ord.number.contramap((level: LogLevel) => level.ordinal);
