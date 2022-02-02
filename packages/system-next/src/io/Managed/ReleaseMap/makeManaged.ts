import type { ExecutionStrategy } from "../../ExecutionStrategy"
import { Managed } from "../definition"
import { ReleaseMap } from "./definition"

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap`
 * will be released with the in parallel as the release action for the
 * resulting `Managed`.
 *
 * @tsplus static ets/ReleaseMapOps makeManaged
 */
export function makeManaged(
  executionStrategy: ExecutionStrategy,
  __etsTrace?: string
): Managed<unknown, never, ReleaseMap> {
  return Managed.acquireReleaseExitWith(ReleaseMap.make, (map, exit) =>
    map.releaseAll(exit, executionStrategy)
  )
}
