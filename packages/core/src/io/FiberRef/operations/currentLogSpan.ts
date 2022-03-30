import { List } from "../../../collection/immutable/List"
import { LazyValue } from "../../../data/LazyValue"
import type { LogSpan } from "../../LogSpan"
import { FiberRef } from "../definition"

/**
 * @tsplus static ets/FiberRefOps currentLogSpan
 */
export const currentLogSpan: LazyValue<FiberRef<List<LogSpan>>> = LazyValue.make(() =>
  FiberRef.unsafeMake(List.empty<LogSpan>())
)
