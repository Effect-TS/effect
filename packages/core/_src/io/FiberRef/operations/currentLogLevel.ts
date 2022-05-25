/**
 * @tsplus static ets/FiberRef/Ops currentLogLevel
 */
export const currentLogLevel: LazyValue<FiberRef<LogLevel, (a: LogLevel) => LogLevel>> = LazyValue.make(() =>
  FiberRef.unsafeMake(LogLevel.Info)
)
