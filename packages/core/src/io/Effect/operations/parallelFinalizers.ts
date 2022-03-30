import type { LazyArg } from "../../../data/Function"
import type { HasScope } from "../../Scope"
import { Scope } from "../../Scope"
import { Effect } from "../definition"

/**
 * @tsplus static ets/EffectOps parallelFinalizers
 */
export function parallelFinalizers<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R & HasScope, E, A> {
  return Effect.Do()
    .bind("outerScope", () => Effect.scope)
    .bind("innerScope", () => Scope.parallel())
    .tap(({ innerScope, outerScope }) =>
      outerScope.addFinalizerExit((exit) => innerScope.close(exit))
    )
    .flatMap(({ innerScope }) => innerScope.extend(effect))
}
