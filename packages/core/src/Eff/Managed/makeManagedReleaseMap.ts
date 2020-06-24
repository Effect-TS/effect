import { ExecutionStrategy, Sequential } from "../Effect/ExecutionStrategy"

import { makeExit_ } from "./makeExit_"
import { Managed } from "./managed"
import { makeReleaseMap, ReleaseMap } from "./releaseMap"

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap` will
 * be released with the specified `ExecutionStrategy` as the release action
 * for the resulting `Managed`.
 */
export const makeManagedReleaseMap = <E extends ExecutionStrategy>(
  es: E
): Managed<E extends Sequential ? never : unknown, unknown, never, ReleaseMap> =>
  makeExit_(makeReleaseMap, (rm, e) => rm.releaseAll(e, es)) as any
