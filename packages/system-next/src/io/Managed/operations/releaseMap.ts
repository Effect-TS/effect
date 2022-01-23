import * as Tp from "../../../collection/immutable/Tuple"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import type { ReleaseMap } from "../ReleaseMap/definition"
import * as Finalizer from "../ReleaseMap/finalizer"
import * as T from "./_internal/effect"

/**
 * Provides access to the entire map of resources allocated by this ZManaged.
 */
export const releaseMap: Managed<unknown, never, ReleaseMap> = managedApply(
  T.map_(get(currentReleaseMap.value), (_) => Tp.tuple(Finalizer.noopFinalizer, _))
)
