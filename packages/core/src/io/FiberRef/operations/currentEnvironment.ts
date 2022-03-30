import { identity } from "../../../data/Function"
import { LazyValue } from "../../../data/LazyValue"
import { FiberRef } from "../definition"

/**
 * @tsplus static ets/FiberRefOps currentEnvironment
 */
export const currentEnvironment: LazyValue<FiberRef<any>> = LazyValue.make(() =>
  FiberRef.unsafeMake({}, identity, (a, _) => a)
)
