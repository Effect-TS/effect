import type { Managed } from "../definition"
import type { ExecutionStrategy } from "../operations/_internal/effect"
import { acquireReleaseExitWith_ } from "../operations/acquireReleaseExitWith"
import type { ReleaseMap } from "./definition"
import { make } from "./make"
import { releaseAll_ } from "./releaseAll"

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap`
 * will be released with the in parallel as the release action for the
 * resulting `ZManaged`.
 */
export function makeManaged(
  executionStrategy: ExecutionStrategy,
  __trace?: string
): Managed<unknown, never, ReleaseMap> {
  return acquireReleaseExitWith_(
    make,
    (m, e) => releaseAll_(m, e, executionStrategy),
    __trace
  )
}
