import { LazyValue } from "../../../data/LazyValue"
import { LogLevel } from "../../LogLevel"
import { FiberRef } from "../definition"

/**
 * @tsplus static ets/FiberRefOps currentLogLevel
 */
export const currentLogLevel: LazyValue<FiberRef<LogLevel>> = LazyValue.make(() =>
  FiberRef.unsafeMake(LogLevel.Info)
)
