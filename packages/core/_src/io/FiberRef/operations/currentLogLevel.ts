/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogLevel
 */
export const currentLogLevel: LazyValue<FiberRef<LogLevel, (a: LogLevel) => LogLevel>> = LazyValue.make(() =>
  FiberRef.unsafeMake(LogLevel.Info)
)
