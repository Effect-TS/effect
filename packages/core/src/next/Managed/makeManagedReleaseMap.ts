import { ExecutionStrategy, Sequential } from "../Effect/ExecutionStrategy"

import { makeExit_ } from "./makeExit_"
import { Managed } from "./managed"
import { makeReleaseMap, ReleaseMap } from "./releaseMap"

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap` will
 * be released with the specified `ExecutionStrategy` as the release action
 * for the resulting `Managed`.
 */
export function makeManagedReleaseMap(
  es: Sequential
): Managed<never, unknown, never, ReleaseMap>
export function makeManagedReleaseMap(
  es: ExecutionStrategy
): Managed<unknown, unknown, never, ReleaseMap>
export function makeManagedReleaseMap(
  es: ExecutionStrategy
): Managed<unknown, unknown, any, ReleaseMap> {
  return makeExit_(makeReleaseMap, (rm, e) => rm.releaseAll(e, es))
}
