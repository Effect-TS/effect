import { LazyValue } from "../../../data/LazyValue"
import { Option } from "../../../data/Option"
import type { FiberScope } from "../../FiberScope"
import { FiberRef } from "../definition"

/**
 * @tsplus static ets/FiberRefOps forkScopeOverride
 */
export const forkScopeOverride: LazyValue<FiberRef<Option<FiberScope>>> =
  LazyValue.make(() =>
    FiberRef.unsafeMake(
      Option.none,
      () => Option.none,
      (a, _) => a
    )
  )
