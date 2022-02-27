import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { FiberRef } from "../../FiberRef"
import { Managed } from "../definition"
import type { Finalizer } from "../ReleaseMap/finalizer"

/**
 * A scope in which `Managed` values can be safely allocated. Passing a managed
 * resource to the `apply` method will return an effect that allocates the
 * resource and returns it with an early-release handle.
 */
export interface Scope {
  <R, E, A>(managed: LazyArg<Managed<R, E, A>>): Effect<R, E, Tuple<[Finalizer, A]>>
}

/**
 * Creates a scope in which resources can be safely allocated into together
 * with a release action.
 *
 * @tsplus static ets/ManagedOps scope
 */
export const scope: Managed<unknown, never, Scope> = Managed.releaseMap.map(
  (finalizers) =>
    <R, E, A>(
      managed: LazyArg<Managed<R, E, A>>
    ): Effect<R, E, Tuple<[Finalizer, A]>> =>
      Effect.succeed(managed).flatMap((_) =>
        _.effect.apply(FiberRef.currentReleaseMap.value.locally(finalizers))
      )
)
