import type { Layer } from "../../Layer/definition"
import { Scope } from "../../Scope"
import { Effect } from "../definition"

/**
 * Provides a layer to the effect, which translates it to another level.
 *
 * @tsplus fluent ets/Effect provideLayer
 */
export function provideLayer_<R, E, A, E1, A1>(
  self: Effect<A, E1, A1>,
  layer: Layer<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E | E1, A1> {
  return Effect.acquireReleaseExitWith(
    Scope.make,
    (scope) => layer.buildWithScope(scope).flatMap((r) => self.provideEnvironment(r)),
    (scope, exit) => scope.close(exit)
  )
}

/**
 * Provides a layer to the effect, which translates it to another level.
 */
export const provideLayer = Pipeable(provideLayer_)
