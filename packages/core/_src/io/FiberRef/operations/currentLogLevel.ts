/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogLevel
 */
export const currentLogLevel: FiberRef<LogLevel, (a: LogLevel) => LogLevel> = FiberRef.unsafeMake(LogLevel.Info)
