import { Map } from "../../../collection/immutable/Map"
import { LazyValue } from "../../../data/LazyValue"
import { FiberRef } from "../definition"

/**
 * @tsplus static ets/FiberRefOps currentLogAnnotations
 */
export const currentLogAnnotations: LazyValue<FiberRef<Map<string, string>>> =
  LazyValue.make(() => FiberRef.unsafeMake(new Map()))
