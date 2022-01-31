import { Tuple } from "../../../collection/immutable/Tuple"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { Managed } from "../definition"
import type { ReleaseMap } from "../ReleaseMap/definition"
import * as Finalizer from "../ReleaseMap/finalizer"

/**
 * Provides access to the entire map of resources allocated by this `Managed`.
 *
 * @ets static ets/ManagedOps releaseMap
 */
export const releaseMap: Managed<unknown, never, ReleaseMap> = Managed(
  fiberRefGet(currentReleaseMap.value).map((_) => Tuple(Finalizer.noopFinalizer, _))
)
