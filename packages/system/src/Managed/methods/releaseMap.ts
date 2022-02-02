// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import { environment, map } from "../deps"
import type { Managed } from "../managed"
import { managedApply } from "../managed"
import type { ReleaseMap } from "../ReleaseMap"
import { noopFinalizer } from "../ReleaseMap/finalizer"

/**
 * Provides access to the entire map of resources allocated by this {@link Managed}.
 */
export const releaseMap: Managed<unknown, never, ReleaseMap> = managedApply(
  pipe(
    environment<Tp.Tuple<[unknown, ReleaseMap]>>(),
    map((tp) => Tp.tuple(noopFinalizer, tp.get(1)))
  )
)
