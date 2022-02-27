import type { LazyValue } from "../../../data/LazyValue"
import { FiberRef } from "../../FiberRef"
import type { ReleaseMap } from "../ReleaseMap"

/**
 * @tsplus static ets/ManagedOps currentReleaseMap
 */
export const currentReleaseMap: LazyValue<FiberRef.Runtime<ReleaseMap>> =
  FiberRef.currentReleaseMap
