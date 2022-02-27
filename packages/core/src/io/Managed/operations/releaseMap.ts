import { Tuple } from "../../../collection/immutable/Tuple"
import { FiberRef } from "../../FiberRef"
import { Managed } from "../definition"
import type { ReleaseMap } from "../ReleaseMap/definition"
import * as Finalizer from "../ReleaseMap/finalizer"

/**
 * Provides access to the entire map of resources allocated by this `Managed`.
 *
 * @tsplus static ets/ManagedOps releaseMap
 */
export const releaseMap: Managed<unknown, never, ReleaseMap> = Managed(
  FiberRef.currentReleaseMap.value
    .get()
    .map((releaseMap) => Tuple(Finalizer.noopFinalizer, releaseMap))
)
