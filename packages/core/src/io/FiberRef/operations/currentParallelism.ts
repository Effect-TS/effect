import { LazyValue } from "../../../data/LazyValue"
import { Option } from "../../../data/Option"
import { FiberRef } from "../definition"

/**
 * @tsplus static ets/FiberRefOps currentParallelism
 */
export const currentParallelism: LazyValue<FiberRef<Option<number>>> = LazyValue.make(
  () => FiberRef.unsafeMake(Option.none)
)
