import { IGetForkScope, IOverrideForkScope } from "@effect/core/io/Effect/definition/primitives"

export interface Grafter {
  <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A>
}

/**
 * Transplants specified effects so that when those effects fork other
 * effects, the forked effects will be governed by the scope of the fiber that
 * executes this effect.
 *
 * This can be used to "graft" deep grandchildren onto a higher-level scope,
 * effectively extending their lifespans into the parent scope.
 *
 * @tsplus static effect/core/io/Effect.Ops transplant
 */
export function transplant<R, E, A>(
  f: (grafter: Grafter) => Effect<R, E, A>
): Effect<R, E, A> {
  return Effect.suspendSucceed(
    new IGetForkScope((scope) =>
      f((effect) =>
        Effect.suspendSucceed(
          new IOverrideForkScope(effect, Maybe.some(scope))
        )
      )
    )
  )
}
