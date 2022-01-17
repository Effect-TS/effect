import type * as Tp from "../../Collections/Immutable/Tuple"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import type { Finalizer } from "../ReleaseMap/finalizer"
import * as T from "./_internal/effect"
import { map_ } from "./map"
import { releaseMap } from "./releaseMap"

/**
 * A scope in which Managed values can be safely allocated. Passing a managed
 * resource to the `apply` method will return an effect that allocates the resource
 * and returns it with an early-release handle.
 */
export interface Scope {
  <R, E, A>(ma: Managed<R, E, A>): T.Effect<R, E, Tp.Tuple<[Finalizer, A]>>
}

/**
 * Creates a scope in which resources can be safely allocated into together
 * with a release action.
 */
export const scope: Managed<unknown, never, Scope> = map_(
  releaseMap,
  (finalizers) =>
    <R, E, A>(self: Managed<R, E, A>): T.Effect<R, E, Tp.Tuple<[Finalizer, A]>> =>
      T.chain_(T.environment<R>(), (r) =>
        locally_(currentReleaseMap.value, finalizers, self.effect)
      )
)
